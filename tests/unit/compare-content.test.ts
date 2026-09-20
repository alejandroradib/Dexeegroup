import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { COMPARE_SLUGS, isCompareSlug, parseFrontmatter } from "@/lib/content/compare";

const LOCALES = ["en", "es"] as const;

function read(slug: string, locale: string) {
  const file = path.join(process.cwd(), "content", "compare", locale, `${slug}.mdx`);
  return parseFrontmatter(readFileSync(file, "utf8"));
}

describe("frontmatter parsing", () => {
  it("reads a fenced block of key and value lines", () => {
    const { data, body } = parseFrontmatter(
      "---\ntitle: A title\nupdated: 2026-01-01\n---\n# Body\n",
    );
    expect(data).toEqual({ title: "A title", updated: "2026-01-01" });
    expect(body).toBe("# Body\n");
  });

  it("keeps colons inside a value", () => {
    const { data } = parseFrontmatter("---\ntitle: Dexee: the comparison\n---\nbody");
    expect(data.title).toBe("Dexee: the comparison");
  });

  it("strips surrounding quotes", () => {
    const { data } = parseFrontmatter('---\ntitle: "Quoted"\n---\nbody');
    expect(data.title).toBe("Quoted");
  });

  it("returns the whole file as body when there is no frontmatter", () => {
    const { data, body } = parseFrontmatter("# Just markdown");
    expect(data).toEqual({});
    expect(body).toBe("# Just markdown");
  });
});

describe("comparison pages", () => {
  it("recognises only the published slugs", () => {
    expect(isCompareSlug("dexee-vs-eor-platforms")).toBe(true);
    expect(isCompareSlug("dexee-vs-everything")).toBe(false);
  });

  for (const locale of LOCALES) {
    for (const slug of COMPARE_SLUGS) {
      describe(`${locale}/${slug}`, () => {
        const { data, body } = read(slug, locale);

        /**
         * PHASES-GTM 9.6: a comparison that never concedes anything reads as marketing
         * and converts worse. This is the acceptance criterion, asserted.
         */
        it("names a scenario where the alternative is the better choice", () => {
          expect(data.bestAlternativeWhen ?? "").not.toBe("");
          expect(
            (data.bestAlternativeWhen ?? "").split(/\s+/).length,
            "the concession is too short to name a real scenario",
          ).toBeGreaterThan(12);
        });

        it("repeats the concession in the body, not only in the frontmatter", () => {
          const headings = body.match(/^##\s+.+$/gm) ?? [];
          const concedes = headings.some((heading) =>
            /better choice|mejor opción|right call|correcto contratar/i.test(heading),
          );
          expect(concedes, `headings were: ${headings.join(" / ")}`).toBe(true);
        });

        it("carries the metadata the page renders", () => {
          expect(data.title ?? "").not.toBe("");
          expect((data.description ?? "").length).toBeGreaterThan(40);
          expect((data.description ?? "").length).toBeLessThanOrEqual(200);
          expect(data.audience ?? "").not.toBe("");
          expect(data.updated ?? "").toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it("contains a comparison table", () => {
          expect(body).toMatch(/\|\s*---/);
        });

        it("links to a page that backs it up", () => {
          expect(body).toMatch(/\]\(\/(pricing|how-we-verify|guarantee|for-companies)/);
        });

        it("keeps the tone rule: no exclamation marks", () => {
          expect(body).not.toContain("!");
        });
      });
    }
  }

  it("publishes the same slugs in both languages", () => {
    for (const slug of COMPARE_SLUGS) {
      expect(() => read(slug, "en")).not.toThrow();
      expect(() => read(slug, "es")).not.toThrow();
    }
  });
});
