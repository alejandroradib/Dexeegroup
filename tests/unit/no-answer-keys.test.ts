import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Audit E1: the assessment banks were committed to a public repository, answer keys
 * included. They now live outside version control. This fails if a keyed bank comes back,
 * whatever it is called. The fixtures under tests/fixtures are deliberately fake and exempt.
 */
const KEY_FIELD = /"(correct|best)"\s*:/;
const EXEMPT = /^tests\/fixtures\//;

describe("no answer keys in the repository", () => {
  it("has no versioned file carrying a correct or best field", () => {
    const files = execSync("git ls-files", { encoding: "utf8" })
      .split("\n")
      .filter((f) => f.endsWith(".json") && !EXEMPT.test(f));
    const offenders = files.filter((f) => KEY_FIELD.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("keeps no keyed bank under supabase/seed", () => {
    const seeded = execSync("git ls-files supabase/seed", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    // ipip50 is public domain and its key is published by IPIP itself (decision 75).
    expect(seeded.filter((f) => f.endsWith(".json"))).toEqual(["supabase/seed/ipip50.json"]);
  });
});
