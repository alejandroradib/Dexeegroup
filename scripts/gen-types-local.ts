/**
 * Generates src/types/database.ts from the migrations without a Supabase project, using the
 * PGlite database. Output follows the shape produced by `supabase gen types typescript`, so
 * `npm run db:types` can overwrite it once a project is linked.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { createTestDatabase } from "./lib/pglite-db";

import type { PGlite } from "@electric-sql/pglite";

type Column = {
  table_name: string;
  column_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  data_type: string;
  udt_name: string;
  udt_schema: string;
  is_identity: "YES" | "NO";
  is_generated: string;
};

type Relationship = {
  table_name: string;
  constraint_name: string;
  columns: string[];
  referenced_table: string;
  referenced_columns: string[];
  is_one_to_one: boolean;
};

const SCALARS: Record<string, string> = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  char: "string",
  citext: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  float4: "number",
  float8: "number",
  numeric: "number",
  bool: "boolean",
  timestamptz: "string",
  timestamp: "string",
  date: "string",
  time: "string",
  json: "Json",
  jsonb: "Json",
  bytea: "string",
};

function tsType(udt: string, udtSchema: string, enums: Map<string, string[]>): string {
  if (udt.startsWith("_")) return `${tsType(udt.slice(1), udtSchema, enums)}[]`;
  if (enums.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
  return SCALARS[udt] ?? "unknown";
}

async function loadEnums(db: PGlite) {
  const res = await db.query<{ name: string; labels: string[] }>(
    `select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
       from pg_type t join pg_enum e on e.enumtypid = t.oid
       join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' group by t.typname order by 1`,
  );
  return new Map(res.rows.map((r) => [r.name, r.labels]));
}

async function loadColumns(db: PGlite, kind: "BASE TABLE" | "VIEW") {
  const res = await db.query<Column>(
    `select c.table_name, c.column_name, c.is_nullable, c.column_default, c.data_type,
            c.udt_name, c.udt_schema, c.is_identity, c.is_generated
       from information_schema.columns c
       join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
      where c.table_schema = 'public' and t.table_type = $1
      order by c.table_name, c.ordinal_position`,
    [kind],
  );
  const byTable = new Map<string, Column[]>();
  for (const col of res.rows) {
    const list = byTable.get(col.table_name) ?? [];
    list.push(col);
    byTable.set(col.table_name, list);
  }
  return byTable;
}

async function loadRelationships(db: PGlite) {
  const res = await db.query<Relationship>(
    `select tc.table_name, tc.constraint_name,
            array_agg(kcu.column_name order by kcu.ordinal_position) as columns,
            ccu.table_name as referenced_table,
            array_agg(ccu.column_name order by kcu.ordinal_position) as referenced_columns,
            exists (
              select 1 from information_schema.table_constraints u
              join information_schema.key_column_usage uk on uk.constraint_name = u.constraint_name and uk.table_schema = u.table_schema
              where u.table_schema = tc.table_schema and u.table_name = tc.table_name
                and u.constraint_type in ('UNIQUE', 'PRIMARY KEY')
              group by u.constraint_name
              having array_agg(uk.column_name::text order by uk.ordinal_position) = array_agg(kcu.column_name::text order by kcu.ordinal_position)
            ) as is_one_to_one
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
       join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY' and ccu.table_schema = 'public'
      group by tc.table_name, tc.constraint_name, ccu.table_name, tc.table_schema
      order by tc.table_name, tc.constraint_name`,
  );
  const byTable = new Map<string, Relationship[]>();
  for (const rel of res.rows) {
    const list = byTable.get(rel.table_name) ?? [];
    list.push(rel);
    byTable.set(rel.table_name, list);
  }
  return byTable;
}

async function loadFunctions(db: PGlite, enums: Map<string, string[]>) {
  const res = await db.query<{
    name: string;
    arg_names: string[] | null;
    arg_types: string[] | null;
    return_type: string;
    returns_set: boolean;
  }>(
    `select p.proname as name,
            p.proargnames as arg_names,
            (select array_agg(format_type(t, null) order by ord) from unnest(p.proargtypes) with ordinality as a(t, ord)) as arg_types,
            format_type(p.prorettype, null) as return_type,
            p.proretset as returns_set
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f' and format_type(p.prorettype, null) <> 'trigger'
      order by p.proname`,
  );
  const map = (sqlType: string): string => {
    const clean = sqlType.replace(/^public\./, "").replace(/\[\]$/, "");
    const isArray = sqlType.endsWith("[]");
    const base = enums.has(clean)
      ? `Database["public"]["Enums"]["${clean}"]`
      : ({
          uuid: "string",
          text: "string",
          integer: "number",
          bigint: "number",
          numeric: "number",
          boolean: "boolean",
          "timestamp with time zone": "string",
          date: "string",
          jsonb: "Json",
          json: "Json",
        }[clean] ?? "unknown");
    return isArray ? `${base}[]` : base;
  };
  return res.rows.map((fn) => {
    const names = fn.arg_names ?? [];
    const types = fn.arg_types ?? [];
    const args =
      types.length === 0
        ? "Record<PropertyKey, never>"
        : `{ ${types.map((t, i) => `${names[i] ?? `arg${i}`}: ${map(t)}`).join("; ")} }`;
    const ret = fn.returns_set ? `${map(fn.return_type)}[]` : map(fn.return_type);
    return `      ${fn.name}: {\n        Args: ${args}\n        Returns: ${ret}\n      }`;
  });
}

function renderRow(
  cols: Column[],
  enums: Map<string, string[]>,
  mode: "Row" | "Insert" | "Update",
) {
  return cols
    .map((c) => {
      const base = tsType(c.udt_name, c.udt_schema, enums);
      const nullable = c.is_nullable === "YES";
      const hasDefault = c.column_default !== null || c.is_identity === "YES";
      if (mode === "Row") return `          ${c.column_name}: ${base}${nullable ? " | null" : ""}`;
      if (c.is_generated === "ALWAYS") return null;
      const optional = mode === "Update" || nullable || hasDefault;
      return `          ${c.column_name}${optional ? "?" : ""}: ${base}${nullable ? " | null" : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function renderRelationships(rels: Relationship[] | undefined) {
  if (!rels || rels.length === 0) return "        Relationships: []";
  const items = rels
    .map(
      (r) =>
        `          {\n            foreignKeyName: "${r.constraint_name}"\n            columns: [${r.columns.map((c) => `"${c}"`).join(", ")}]\n            isOneToOne: ${r.is_one_to_one}\n            referencedRelation: "${r.referenced_table}"\n            referencedColumns: [${r.referenced_columns.map((c) => `"${c}"`).join(", ")}]\n          }`,
    )
    .join(",\n");
  return `        Relationships: [\n${items}\n        ]`;
}

async function main() {
  const db = await createTestDatabase();
  const enums = await loadEnums(db);
  const tables = await loadColumns(db, "BASE TABLE");
  const views = await loadColumns(db, "VIEW");
  const rels = await loadRelationships(db);
  const functions = await loadFunctions(db, enums);

  const tableBlocks = [...tables.entries()].map(
    ([name, cols]) =>
      `      ${name}: {\n        Row: {\n${renderRow(cols, enums, "Row")}\n        }\n        Insert: {\n${renderRow(cols, enums, "Insert")}\n        }\n        Update: {\n${renderRow(cols, enums, "Update")}\n        }\n${renderRelationships(rels.get(name))}\n      }`,
  );
  const viewBlocks = [...views.entries()].map(
    ([name, cols]) =>
      `      ${name}: {\n        Row: {\n${renderRow(cols, enums, "Row")}\n        }\n        Relationships: []\n      }`,
  );
  const enumBlocks = [...enums.entries()].map(
    ([name, labels]) => `      ${name}: ${labels.map((l) => `"${l}"`).join(" | ")}`,
  );

  const out = `// Generated by scripts/gen-types-local.ts from supabase/migrations. Do not edit by hand.
// Regenerate with \`npm run db:types\` (linked project) or \`npx tsx scripts/gen-types-local.ts\`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13"
  }
  public: {
    Tables: {
${tableBlocks.join("\n")}
    }
    Views: {
${viewBlocks.join("\n")}
    }
    Functions: {
${functions.join("\n")}
    }
    Enums: {
${enumBlocks.join("\n")}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
`;
  const target = path.resolve(process.cwd(), "src/types/database.ts");
  writeFileSync(target, out);
  console.log(
    `Wrote ${target}: ${tables.size} tables, ${views.size} views, ${enums.size} enums, ${functions.length} functions`,
  );
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
