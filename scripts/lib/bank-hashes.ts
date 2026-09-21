/**
 * Retired bank fingerprints (audit E2).
 *
 * The banks that shipped in the public repository are burned. Their item texts are hashed
 * into `.banks/retired-hashes.json` and the loader refuses any new item whose text matches,
 * so a rotation cannot accidentally reuse an exposed question. Hashes catch verbatim reuse
 * only: not repeating an idea in different words is an authoring rule, not a check.
 */
import { createHash } from "node:crypto";

export type RetiredHashes = { version: number; generated_at: string; hashes: string[] };

export function normalizeBankText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function hashBankText(text: string): string {
  return createHash("sha256").update(normalizeBankText(text)).digest("hex");
}

/** Every item text of a bank file, whatever its shape. Used on both sides of the check. */
export function bankTexts(bank: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (
          typeof value === "string" &&
          /^(prompt|prompt_en|prompt_es|text|text_en|text_es)$/.test(key)
        ) {
          if (value.trim().length >= 20) out.push(value);
        } else {
          walk(value);
        }
      }
    }
  };
  walk(bank);
  return out;
}
