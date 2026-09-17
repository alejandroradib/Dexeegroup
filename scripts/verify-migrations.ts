/**
 * Applies every migration and the seed to an in-memory Postgres, asserts that RLS is enabled
 * on every public table, and runs the access matrix from SPEC section 8 with per-role sessions.
 * Runs in CI without a Supabase project. `npm run rls:test` runs the same matrix remotely.
 */
import { createTestDatabase } from "./lib/pglite-db";
import { runAccessMatrix } from "./lib/rls-matrix";

async function main() {
  const started = Date.now();
  const db = await createTestDatabase({ seed: true });
  console.log(`Migrations and seed applied in ${Date.now() - started} ms`);

  const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(
    `select c.relname, c.relrowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' order by 1`,
  );
  const withoutRls = tables.rows.filter((t) => !t.relrowsecurity).map((t) => t.relname);
  if (withoutRls.length > 0) {
    throw new Error(`Tables without RLS: ${withoutRls.join(", ")}`);
  }
  console.log(`RLS enabled on all ${tables.rows.length} public tables`);

  const summary = await runAccessMatrix(db);
  console.log(`Access matrix: ${summary.passed} passed, ${summary.failed} failed`);
  if (summary.failed > 0) {
    for (const failure of summary.failures) console.error(`  FAIL ${failure}`);
    process.exit(1);
  }
  await db.close();
}

main().catch((error: unknown) => {
  const err = error as { message?: string; code?: string; detail?: string; hint?: string };
  console.error(`verify-migrations failed: ${err.message ?? String(error)}`);
  if (err.code) console.error(`  code: ${err.code}`);
  if (err.detail) console.error(`  detail: ${err.detail}`);
  if (err.hint) console.error(`  hint: ${err.hint}`);
  process.exit(1);
});
