import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDatabase } from "../../scripts/lib/pglite-db";
import { runAccessMatrix } from "../../scripts/lib/rls-matrix";

import type { PGlite } from "@electric-sql/pglite";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase({ seed: true });
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("database access matrix", () => {
  it("enables RLS on every public table", async () => {
    const res = await db.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(res.rows).toEqual([]);
  });

  it("passes every assertion of SPEC section 8", async () => {
    const summary = await runAccessMatrix(db);
    expect(summary.failures).toEqual([]);
    expect(summary.passed).toBeGreaterThan(60);
  });
});
