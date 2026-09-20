import { describe, expect, it } from "vitest";

import en from "@/../messages/en.json";
import es from "@/../messages/es.json";

type Messages = Record<string, unknown>;

function flatten(source: Messages, prefix = ""): string[] {
  return Object.entries(source).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value as Messages, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function entries(source: Messages, prefix = ""): [string, string][] {
  return Object.entries(source).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? entries(value as Messages, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)] as [string, string]],
  );
}

/** {name}, but not {{ escaped }} or a CSS-looking brace. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)(?:,[^}]*)?\}/g)].map((match) => match[1] ?? "").sort();
}

const enKeys = flatten(en as Messages);
const esKeys = flatten(es as Messages);

/**
 * Parity was held by hand until Phase 9, which added several hundred keys. A missing key
 * renders as the raw key path on a live page, which is the kind of thing that ships.
 */
describe("message parity", () => {
  it("has the same keys in both languages", () => {
    const missingInEs = enKeys.filter((key) => !esKeys.includes(key));
    const missingInEn = esKeys.filter((key) => !enKeys.includes(key));
    expect(missingInEs, "keys missing from messages/es.json").toEqual([]);
    expect(missingInEn, "keys missing from messages/en.json").toEqual([]);
  });

  it("has no empty strings", () => {
    for (const [key, value] of entries(en as Messages)) {
      expect(value.trim(), `en.${key} is empty`).not.toBe("");
    }
    for (const [key, value] of entries(es as Messages)) {
      expect(value.trim(), `es.${key} is empty`).not.toBe("");
    }
  });

  it("uses the same placeholders in both languages", () => {
    const spanish = new Map(entries(es as Messages));
    for (const [key, value] of entries(en as Messages)) {
      const other = spanish.get(key);
      if (other === undefined) continue;
      expect(placeholders(other), `placeholders differ on "${key}"`).toEqual(placeholders(value));
    }
  });

  it("keeps the tone rule: no exclamation marks and no emoji in UI copy", () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const locale of [
      ["en", en],
      ["es", es],
    ] as const) {
      for (const [key, value] of entries(locale[1] as Messages)) {
        expect(value, `${locale[0]}.${key} has an exclamation mark`).not.toContain("!");
        expect(emoji.test(value), `${locale[0]}.${key} has an emoji`).toBe(false);
      }
    }
  });

  it("never leaves a Spanish string identical to its English one, except for proper nouns", () => {
    // A copied string is almost always an untranslated one. The exceptions are names and
    // terms that genuinely do not translate.
    const allowed = /^(Dexee|Leads|USD|LinkedIn|CEFR|SJT|IPIP|B1|B2|C1|C2|A1|A2|Barranquilla)/;
    // The tagline is brand copy and stays in English in both locales, by design.
    const intentional = new Set(["common.tagline"]);
    const spanish = new Map(entries(es as Messages));
    const copied: string[] = [];
    for (const [key, value] of entries(en as Messages)) {
      const other = spanish.get(key);
      if (other === undefined || other !== value) continue;
      if (value.split(/\s+/).length < 3) continue;
      if (allowed.test(value) || intentional.has(key)) continue;
      copied.push(`${key}: ${value}`);
    }
    expect(copied, "these Spanish strings are still in English").toEqual([]);
  });
});
