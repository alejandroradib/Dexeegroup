import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";

import { asUser, createTestDatabase } from "../../scripts/lib/pglite-db";
import { SEED } from "../../scripts/lib/seed-ids";

import type { PGlite } from "@electric-sql/pglite";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase({ seed: true });
}, 120_000);

afterAll(async () => {
  await db.close();
});

/**
 * Audit B: the sitemap is built from public_jobs exactly as the route does it, so a job of a
 * company flagged is_demo must not produce an entry even though it is published.
 */
describe("sitemap and demo companies", () => {
  it("drops every job of a demo company from the sitemap", async () => {
    await db.query("update public.companies set is_demo = true where id = $1", [
      SEED.companies.harbor,
    ]);
    const demoSlugs = (
      await db.query<{ slug: string }>("select slug from public.jobs where company_id = $1", [
        SEED.companies.harbor,
      ])
    ).rows.map((r) => r.slug);
    expect(demoSlugs.length).toBeGreaterThan(0);

    const jobs = await asUser(
      db,
      { id: null, role: "anon" },
      async (tx) =>
        (
          await tx.query<{ slug: string; published_at: string | null }>(
            "select slug, published_at from public.public_jobs",
          )
        ).rows,
      { commit: false },
    );
    const entries = buildSitemapEntries("https://dexeegroup.com", jobs);
    const urls = entries.map((e) => e.url);
    for (const slug of demoSlugs) {
      expect(urls.some((u) => u.endsWith(`/jobs/${slug}`))).toBe(false);
    }
    // Real jobs are still listed, in both locales.
    expect(urls.filter((u) => /\/(en|es)\/jobs\/.+/.test(u)).length).toBeGreaterThan(0);
    expect(urls).toContain("https://dexeegroup.com/es/jobs");
  });
});
