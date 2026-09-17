import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "@/lib/env";

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
      CRON_SECRET: "12345678",
    } as unknown as NodeJS.ProcessEnv);
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5");
    expect(env.EMAIL_FROM).toContain("dexeegroup.com");
  });
});
