import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "@/lib/env";

// Generated per run so no secret-shaped literal lives in the repository (gitleaks).
const RANDOM_SECRET = randomBytes(20).toString("hex");

describe("env validation", () => {
  it("fails fast with a readable message when a required variable is missing", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(() => parseServerEnv({ CRON_SECRET: "short" } as unknown as NodeJS.ProcessEnv)).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it("applies defaults", () => {
    const env = parseServerEnv({
      SUPABASE_SERVICE_ROLE_KEY: "k",
      CRON_SECRET: RANDOM_SECRET,
    } as unknown as NodeJS.ProcessEnv);
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5");
    expect(env.EMAIL_FROM).toContain("dexeegroup.com");
  });

  // Audit I17: the cron secret must be long and random.
  it("rejects a short cron secret", () => {
    expect(() =>
      parseServerEnv({
        SUPABASE_SERVICE_ROLE_KEY: "k",
        CRON_SECRET: "only-twenty-characters",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/CRON_SECRET/);
  });

  it("rejects placeholder and single-character cron secrets even when long enough", () => {
    for (const value of [
      "change-me-change-me-change-me-change-me",
      "placeholder-0123456789-0123456789-0123",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ]) {
      expect(() =>
        parseServerEnv({
          SUPABASE_SERVICE_ROLE_KEY: "k",
          CRON_SECRET: value,
        } as unknown as NodeJS.ProcessEnv),
      ).toThrow(/CRON_SECRET/);
    }
  });
});
