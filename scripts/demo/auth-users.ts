/** Data access for the fake GoTrue: auth.users, auth.identities, auth.sessions, auth.refresh_tokens. */
import { randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { one, query } from "./db";
import { accessToken } from "./jwt";

export type UserRow = {
  id: string;
  aud: string | null;
  role: string | null;
  email: string | null;
  encrypted_password: string | null;
  email_confirmed_at: Date | null;
  invited_at: Date | null;
  last_sign_in_at: Date | null;
  banned_until: Date | null;
  raw_user_meta_data: Record<string, unknown> | null;
  raw_app_meta_data: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

type IdentityRow = {
  id: string;
  user_id: string;
  provider_id: string | null;
  identity_data: Record<string, unknown> | null;
  provider: string | null;
  last_sign_in_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);

export async function findUserById(id: string): Promise<UserRow | null> {
  return one<UserRow>("select * from auth.users where id = $1 and deleted_at is null", [id]);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return one<UserRow>(
    "select * from auth.users where lower(email) = lower($1) and deleted_at is null",
    [email],
  );
}

/** GoTrue user JSON, as @supabase/auth-js expects it. */
export async function toUserJson(user: UserRow): Promise<Record<string, unknown>> {
  const identities = await query<IdentityRow>(
    "select * from auth.identities where user_id = $1 order by created_at",
    [user.id],
  );
  return {
    id: user.id,
    aud: user.aud ?? "authenticated",
    role: user.role ?? "authenticated",
    email: user.email ?? "",
    email_confirmed_at: iso(user.email_confirmed_at),
    invited_at: iso(user.invited_at),
    phone: "",
    confirmed_at: iso(user.email_confirmed_at),
    last_sign_in_at: iso(user.last_sign_in_at),
    banned_until: iso(user.banned_until),
    app_metadata: user.raw_app_meta_data ?? { provider: "email", providers: ["email"] },
    user_metadata: user.raw_user_meta_data ?? {},
    identities: identities.map((i) => ({
      identity_id: i.id,
      id: i.provider_id ?? user.id,
      user_id: i.user_id,
      identity_data: i.identity_data ?? {},
      provider: i.provider ?? "email",
      last_sign_in_at: iso(i.last_sign_in_at),
      created_at: i.created_at.toISOString(),
      updated_at: i.updated_at.toISOString(),
      email: user.email ?? "",
    })),
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
    is_anonymous: false,
  };
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(password: string, hash: string | null): boolean {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export type CreateUserInput = {
  email: string;
  password: string | null;
  confirmed: boolean;
  userMetadata: Record<string, unknown>;
  invited?: boolean;
};

/** Inserts auth.users + auth.identities; the DB trigger handle_new_user creates public.profiles. */
export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const id = randomUUID();
  const hash = input.password ? hashPassword(input.password) : null;
  const user = await one<UserRow>(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, invited_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3,
       case when $4 then now() else null end, case when $5 then now() else null end,
       '{"provider":"email","providers":["email"]}'::jsonb, $6::jsonb, now(), now())
     returning *`,
    [
      id,
      input.email.toLowerCase(),
      hash,
      input.confirmed,
      input.invited ?? false,
      JSON.stringify(input.userMetadata),
    ],
  );
  if (!user) throw new Error("insert into auth.users returned no row");
  await query(
    `insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at)
     values ($1::uuid, $2::text, $3::jsonb, 'email', now())`,
    [
      id,
      id,
      JSON.stringify({
        sub: id,
        email: user.email,
        email_verified: input.confirmed,
        phone_verified: false,
      }),
    ],
  );
  return user;
}

export type UpdateUserInput = {
  password?: string;
  email?: string;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
  banDuration?: string;
  emailConfirm?: boolean;
};

/** Parses GoTrue ban durations such as "876000h", "30m", "none". */
function banInterval(duration: string): string | null {
  if (duration === "none") return null;
  const match = /^(\d+)(h|m|s)$/.exec(duration);
  if (!match) return null;
  const unit = { h: "hours", m: "minutes", s: "seconds" }[match[2] as "h" | "m" | "s"];
  return `${match[1]} ${unit}`;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserRow | null> {
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [id];
  const add = (fragment: string, value: unknown) => {
    params.push(value);
    sets.push(fragment.replace("?", `$${params.length}`));
  };
  if (input.password) add("encrypted_password = ?", hashPassword(input.password));
  if (input.email) add("email = ?", input.email.toLowerCase());
  if (input.userMetadata)
    add(
      "raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || ?::jsonb",
      JSON.stringify(input.userMetadata),
    );
  if (input.appMetadata)
    add(
      "raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || ?::jsonb",
      JSON.stringify(input.appMetadata),
    );
  if (input.emailConfirm) sets.push("email_confirmed_at = coalesce(email_confirmed_at, now())");
  if (input.banDuration !== undefined) {
    const interval = banInterval(input.banDuration);
    if (interval) add("banned_until = now() + ?::interval", interval);
    else sets.push("banned_until = null");
  }
  return one<UserRow>(`update auth.users set ${sets.join(", ")} where id = $1 returning *`, params);
}

export async function deleteUser(id: string): Promise<void> {
  await query("delete from auth.users where id = $1", [id]);
}

export async function listUsers(
  page: number,
  perPage: number,
): Promise<{ users: UserRow[]; total: number }> {
  const users = await query<UserRow>(
    "select * from auth.users where deleted_at is null order by created_at offset $1 limit $2",
    [(page - 1) * perPage, perPage],
  );
  const count = await one<{ n: string }>(
    "select count(*)::text as n from auth.users where deleted_at is null",
  );
  return { users, total: Number(count?.n ?? 0) };
}

export type SessionJson = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: Record<string, unknown>;
};

/** Creates (or continues) a session and issues an access + refresh token pair. */
export async function issueSession(
  user: UserRow,
  existingSessionId?: string,
): Promise<SessionJson> {
  let sessionId = existingSessionId;
  if (!sessionId) {
    const session = await one<{ id: string }>(
      "insert into auth.sessions (user_id) values ($1) returning id",
      [user.id],
    );
    sessionId = session?.id ?? randomUUID();
  }
  const refresh = randomBytes(24).toString("base64url");
  await query("insert into auth.refresh_tokens (token, user_id, session_id) values ($1, $2, $3)", [
    refresh,
    user.id,
    sessionId,
  ]);
  const updated =
    (await one<UserRow>("update auth.users set last_sign_in_at = now() where id = $1 returning *", [
      user.id,
    ])) ?? user;
  const { token, exp, expiresIn } = accessToken(
    {
      id: updated.id,
      email: updated.email ?? "",
      app_metadata: updated.raw_app_meta_data ?? {},
      user_metadata: updated.raw_user_meta_data ?? {},
    },
    sessionId,
  );
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: exp,
    refresh_token: refresh,
    user: await toUserJson(updated),
  };
}

/** Looks up a refresh token; old tokens stay valid so client retries never fail in the demo. */
export async function findRefreshToken(
  token: string,
): Promise<{ user_id: string; session_id: string } | null> {
  return one<{ user_id: string; session_id: string }>(
    "select user_id, session_id from auth.refresh_tokens where token = $1",
    [token],
  );
}

export async function revokeSession(sessionId: string): Promise<void> {
  await query("delete from auth.sessions where id = $1", [sessionId]);
}
