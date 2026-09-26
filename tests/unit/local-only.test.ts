import { describe, expect, it } from "vitest";

import { assertLocalSupabaseUrl, isLocalSupabaseUrl } from "../../scripts/lib/local-only";

/** Audit I20: seeds never run against a hosted project by accident. */
describe("local-only seeds", () => {
  it("recognises local Supabase hosts", () => {
    for (const url of [
      "http://127.0.0.1:54321",
      "http://localhost:54321",
      "http://kong:8000",
      "http://supabase_kong_dexee:8000",
      "http://host.docker.internal:54321",
      "http://192.168.1.20:54321",
      "http://10.0.0.5:54321",
    ]) {
      expect(isLocalSupabaseUrl(url), url).toBe(true);
    }
  });

  it("refuses hosted projects and garbage", () => {
    for (const url of [
      "https://abcdefghij.supabase.co",
      "https://dexeegroup.com",
      "not a url",
      undefined,
    ]) {
      expect(isLocalSupabaseUrl(url), String(url)).toBe(false);
    }
    expect(() => assertLocalSupabaseUrl("https://abcdefghij.supabase.co", "db:seed")).toThrow(
      /refuses to run against abcdefghij.supabase.co/,
    );
  });

  it("allows an explicit override only for scripts that declare one", () => {
    const env = { DEMO_SEED_ALLOW_REMOTE: "1" } as unknown as NodeJS.ProcessEnv;
    expect(() =>
      assertLocalSupabaseUrl(
        "https://abcdefghij.supabase.co",
        "seed-demo",
        "DEMO_SEED_ALLOW_REMOTE",
        env,
      ),
    ).not.toThrow();
    expect(() =>
      assertLocalSupabaseUrl("https://abcdefghij.supabase.co", "db:seed", undefined, env),
    ).toThrow();
    expect(() =>
      assertLocalSupabaseUrl(
        "https://abcdefghij.supabase.co",
        "seed-demo",
        "DEMO_SEED_ALLOW_REMOTE",
        {} as NodeJS.ProcessEnv,
      ),
    ).toThrow(/DEMO_SEED_ALLOW_REMOTE=1/);
  });
});
