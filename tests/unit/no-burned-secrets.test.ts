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
]);

const TEXT = /\.(ts|tsx|js|mjs|json|md|mdx|sql|toml|yml|yaml|example|txt|css|html)$/;

function tokens(text: string): string[] {
  return text.match(/[A-Za-z0-9]{12,40}/g) ?? [];
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
