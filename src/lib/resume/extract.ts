import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

/** Text of a PDF resume, pages merged. Throws on an unreadable file; the caller records it. */
export async function extractResumeText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}
