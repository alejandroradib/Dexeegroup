/**
 * Boots an in-memory Postgres (PGlite) that mimics the parts of a Supabase project the
 * migrations depend on: the auth and storage schemas, the anon/authenticated/service roles
 * and their default privileges. Used by verify-migrations, gen-types-local and unit tests.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

import { loadBanks } from "./banks";

export const MIGRATIONS_DIR = path.resolve(process.cwd(), "supabase/migrations");
export const SEED_FILE = path.resolve(process.cwd(), "supabase/seed.sql");

const SUPABASE_STUBS = `
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  provider_id text,
  identity_data jsonb,
  provider text,
  last_sign_in_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;

create or replace function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare parts text[];
begin
  select string_to_array(name, '/') into parts;
  return parts[1 : array_length(parts, 1) - 1];
end $$;
create or replace function storage.filename(name text) returns text language plpgsql immutable as $$
declare parts text[];
begin
  select string_to_array(name, '/') into parts;
  return parts[array_length(parts, 1)];
end $$;
`;

export function listMigrations(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(MIGRATIONS_DIR, name), "utf8") }));
}

export async function createTestDatabase(options: { seed?: boolean; banks?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const migration of listMigrations()) {
    try {
      await db.exec(migration.sql);
    } catch (error) {
      throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`);
    }
  }
  if (options.seed) {
    await db.exec(readFileSync(SEED_FILE, "utf8"));
  }
  if (options.banks) {
    await loadBanksInto(db);
  }
  return db;
}

/** Inserts the JSON question banks the same way scripts/seed.ts does against a real project. */
export async function loadBanksInto(db: PGlite): Promise<number> {
  const banks = loadBanks(path.resolve(process.cwd(), "supabase/seed"));
  const { rows } = await db.query<{ id: string; type: string }>(
    "select id, type from public.assessments",
  );
  let count = 0;
  for (const type of ["english_written", "english_oral", "psychometric", "disc"] as const) {
    const assessment = rows.find((r) => r.type === type);
    if (!assessment) continue;
    for (const q of banks[type]) {
      await db.query(
        `insert into public.assessment_questions (assessment_id, section, band, sort_order, prompt, question_type, options, answer_key, factor, is_active)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, true)`,
        [
          assessment.id,
          q.section,
          q.band,
          q.sort_order,
          q.prompt,
          q.question_type,
          JSON.stringify({ ...q.options, bank_id: q.bank_id }),
          q.answer_key ? JSON.stringify(q.answer_key) : null,
          q.factor,
        ],
      );
      count += 1;
    }
  }
  return count;
}

/** Runs `fn` as the given Supabase role and user inside one transaction, then rolls back or commits. */
export async function asUser<T>(
  db: PGlite,
  user: { id: string | null; role: "anon" | "authenticated" | "service_role" },
  fn: (tx: { query: PGlite["query"]; exec: PGlite["exec"] }) => Promise<T>,
  { commit = true }: { commit?: boolean } = {},
): Promise<T> {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${user.role}`);
    if (user.id) {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user.id]);
    }
    await db.query("select set_config('request.jwt.claim.role', $1, true)", [user.role]);
    const result = await fn({ query: db.query.bind(db), exec: db.exec.bind(db) });
    await db.exec(commit ? "commit" : "rollback");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

/** Creates an auth user (fires handle_new_user) and returns its id. */
export async function createAuthUser(
  db: PGlite,
  email: string,
  meta: Record<string, string>,
): Promise<string> {
  const res = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id",
    [email, JSON.stringify(meta)],
  );
  return res.rows[0]!.id;
}
