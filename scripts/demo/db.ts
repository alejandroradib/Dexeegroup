/** Postgres pool for the fake auth server (superuser on the local demo database). */
import { Pool, type QueryResultRow } from "pg";

import { PG_URL } from "./config";

let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: PG_URL, max: 5 });
  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function one<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
