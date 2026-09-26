import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Fase J, 0.6: email is queued only through enqueueEmails(), which schedules the send right after
 * the response. A direct insert elsewhere would wait for the daily cron of the Hobby plan.
 */
describe("email outbox writes", () => {
  it("only src/server/services/outbox.ts inserts into email_outbox", () => {
    const files = execSync("git ls-files src", { encoding: "utf8" })
      .split("\n")
      .filter((f) => /\.(ts|tsx)$/.test(f) && f !== "src/server/services/outbox.ts");
    const writers = files.filter((file) =>
      /from\(\s*"email_outbox"\s*\)\s*\.(insert|upsert)\(/.test(readFileSync(file, "utf8")),
    );
    expect(writers).toEqual([]);
  });
});
