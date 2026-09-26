import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Audit A1: values that once lived in this repository and are treated as burned (decision 57).
 * Stored as SHA-256 so this file does not reintroduce them. Any versioned text file that
 * contains one of them again fails the suite.
 */
const BURNED = new Set([
  "bba930997fdca86af8968e5c5b715df00402cf9bfb55d2913e022ab495292bd1", // demo accounts password
  "6ee68b57239147f3203f42792d44087781f8ea6e725d749544d9608d31173b1d", // hosted project identifier
  "1a0ee4abc9a4380ebcaa551a607ef112ed5e5aa4b796e1ea6130769e7f04689f", // seed accounts password (Fase J, 0.2)
  "11d8207c60a7517d8f02f69a35b474e40108799aa64089813759717eb9005a67", // seed admin email at the real domain (Fase J, 0.2)
]);

const TEXT = /\.(ts|tsx|js|mjs|json|md|mdx|sql|toml|yml|yaml|example|txt|css|html)$/;

/** Alphanumeric runs (secrets, identifiers) plus email addresses, lowercased. */
function tokens(text: string): string[] {
  const words = text.match(/[A-Za-z0-9]{12,40}/g) ?? [];
  const emails = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []).map((e) =>
    e.toLowerCase(),
  );
  return [...words, ...emails];
}

describe("burned secrets never return", () => {
  it("no versioned file contains a burned value", () => {
    const files = execSync("git ls-files", { encoding: "utf8" })
      .split("\n")
      .filter((f) => f && TEXT.test(f) && f !== "tests/unit/no-burned-secrets.test.ts");
    const hits: string[] = [];
    for (const file of files) {
      const seen = new Set<string>();
      for (const token of tokens(readFileSync(file, "utf8"))) {
        if (seen.has(token)) continue;
        seen.add(token);
        if (BURNED.has(createHash("sha256").update(token).digest("hex"))) hits.push(file);
      }
    }
    expect(hits).toEqual([]);
  });
});
