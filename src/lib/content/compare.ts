import { z } from "zod";

/**
 * Comparison pages (PHASES-GTM 9.6), authored as MDX in `content/compare/<locale>/`.
 *
 * The frontmatter is deliberately small and flat: a page is only publishable if it names
 * the scenario where the alternative is the better choice. `tests/unit/compare-content.test.ts`
 * enforces that, because a comparison that never concedes anything reads as marketing.
 *
 * This module stays free of `server-only` and of `node:fs` so the parser and the schema can
 * be unit-tested directly; reading the files lives in `compare-source.ts`.
 */

export const COMPARE_SLUGS = [
  "hiring-in-colombia-vs-us",
  "dexee-vs-eor-platforms",
  "dexee-vs-freelance-marketplaces",
] as const;

export type CompareSlug = (typeof COMPARE_SLUGS)[number];

export function isCompareSlug(value: string): value is CompareSlug {
  return (COMPARE_SLUGS as readonly string[]).includes(value);
}

export const compareFrontmatterSchema = z.object({
  title: z.string().min(10),
  description: z.string().min(40).max(200),
  /** Who should read this page. Rendered under the title. */
  audience: z.string().min(20),
  /** The concession. Rendered in its own block, never buried in the body. */
  bestAlternativeWhen: z.string().min(40),
  /** ISO date the comparison was last checked against the alternative's public pricing. */
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CompareFrontmatter = z.infer<typeof compareFrontmatterSchema>;
export type CompareDocument = { frontmatter: CompareFrontmatter; body: string };

/**
 * Minimal frontmatter reader: a `---` fenced block of `key: value` lines at the top of the
 * file, scalars only. A dependency for this would be more surface than the format needs,
 * and zod rejects anything the schema does not expect.
 */
export function parseFrontmatter(source: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    data[key] = raw.replace(/^["'](.*)["']$/s, "$1");
  }
  return { data, body: source.slice(match[0].length) };
}
