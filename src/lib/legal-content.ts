import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Locale } from "@/i18n/routing";

export type LegalDocument = "privacy" | "terms";

export async function readLegalDocument(doc: LegalDocument, locale: Locale): Promise<string> {
  const file = path.join(process.cwd(), "content", "legal", locale, `${doc}.mdx`);
  return readFile(file, "utf8");
}
