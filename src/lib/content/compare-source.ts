import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Locale } from "@/i18n/routing";

import { compareFrontmatterSchema, parseFrontmatter } from "./compare";

import type { CompareDocument, CompareSlug } from "./compare";

/** Reads and validates one comparison page. Throws if the frontmatter is incomplete. */
export async function readCompareDocument(
  slug: CompareSlug,
  locale: Locale,
): Promise<CompareDocument> {
  const file = path.join(process.cwd(), "content", "compare", locale, `${slug}.mdx`);
  const source = await readFile(file, "utf8");
  const { data, body } = parseFrontmatter(source);
  return { frontmatter: compareFrontmatterSchema.parse(data), body };
}
