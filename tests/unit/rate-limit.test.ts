import { describe, expect, it } from "vitest";

import {
  createRateLimit,
  MemoryRateLimiter,
  windowKey,
  type RateWindow,
  type SharedLimiter,
} from "@/lib/rate-limit-core";

/** Audit I12: one limiter per window, expiring memory, and no silent fallback in production. */
describe("rate limit core", () => {
  it("keeps distinct limits for two scopes with different windows", async () => {
    const seen: string[] = [];
    const shared = (window: RateWindow): SharedLimiter => ({
      limit: async (key) => {
        seen.push(`${windowKey(window)}|${key}`);
        return { success: true, remaining: window.limit - 1 };
      },
    });
    const rateLimit = createRateLimit({
      shared,
      memory: new MemoryRateLimiter(),
      production: true,
      onStoreMissing: () => undefined,
    });
    await rateLimit("lead", "a", { limit: 5, windowSeconds: 3600 });
    await rateLimit("sign-in", "a", { limit: 20, windowSeconds: 900 });
    expect(seen).toEqual(["5:3600|lead:a", "20:900|sign-in:a"]);
    expect(windowKey({ limit: 5, windowSeconds: 3600 })).not.toBe(
      windowKey({ limit: 20, windowSeconds: 900 }),
    );
  });

  it("counts, denies past the limit and forgets the key when its window ends", () => {
    let now = 1_000_000;
    const memory = new MemoryRateLimiter(() => now);
    const window = { limit: 2, windowSeconds: 60 };
    expect(memory.limit("k", window).success).toBe(true);
    expect(memory.limit("k", window).success).toBe(true);
    expect(memory.limit("k", window)).toEqual({ success: false, remaining: 0 });
    now += 61_000;
    expect(memory.limit("k", window).success).toBe(true);
  });

  it("sweeps expired entries instead of growing forever", () => {
    let now = 0;
    const memory = new MemoryRateLimiter(() => now);
    for (let i = 0; i < 100; i += 1) memory.limit(`k${i}`, { limit: 1, windowSeconds: 10 });
    expect(memory.size).toBe(100);
    now = 120_000;
    memory.limit("fresh", { limit: 1, windowSeconds: 10 });
    expect(memory.size).toBe(1);
  });

  it("fails closed in production without a shared store and reports once", async () => {
    const reports: string[] = [];
    const rateLimit = createRateLimit({
      shared: () => undefined,
      memory: new MemoryRateLimiter(),
      production: true,
      onStoreMissing: (scope) => reports.push(scope),
    });
    expect(await rateLimit("lead", "a", { limit: 5, windowSeconds: 60 })).toEqual({
      success: false,
      remaining: 0,
    });
    await rateLimit("contact", "b", { limit: 5, windowSeconds: 60 });
    expect(reports).toEqual(["lead"]);
  });

  it("falls back to memory outside production", async () => {
    const rateLimit = createRateLimit({
      shared: () => undefined,
      memory: new MemoryRateLimiter(),
      production: false,
      onStoreMissing: () => undefined,
    });
    expect((await rateLimit("lead", "a", { limit: 1, windowSeconds: 60 })).success).toBe(true);
    expect((await rateLimit("lead", "a", { limit: 1, windowSeconds: 60 })).success).toBe(false);
  });
});
