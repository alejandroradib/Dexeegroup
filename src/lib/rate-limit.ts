import "server-only";

import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  createRateLimit,
  MemoryRateLimiter,
  windowKey,
  type RateWindow,
  type SharedLimiter,
} from "@/lib/rate-limit-core";

export type { RateWindow } from "@/lib/rate-limit-core";

const limiters = new Map<string, Ratelimit>();
let redis: Redis | undefined;

/** One Upstash limiter per window (audit I12): the old single instance applied the first window it saw to every scope. */
function upstashLimiter(window: RateWindow): SharedLimiter | undefined {
  const env = serverEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return undefined;
  const key = windowKey(window);
  let limiter = limiters.get(key);
  if (!limiter) {
    redis ??= new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(window.limit, `${window.windowSeconds} s`),
      prefix: `dexee:${key}`,
    });
    limiters.set(key, limiter);
  }
  const shared = limiter;
  return {
    limit: async (id) => {
      const res = await shared.limit(id);
      return { success: res.success, remaining: res.remaining };
    },
  };
}

/**
 * Sliding-window rate limit. Upstash when configured; in-memory per process otherwise, except
 * in production, where a missing store denies the request and logs an error, because one
 * process's memory cannot enforce a limit across instances.
 */
export const rateLimit = createRateLimit({
  shared: upstashLimiter,
  memory: new MemoryRateLimiter(),
  production: process.env.VERCEL_ENV === "production",
  onStoreMissing: (scope) => logger.error({ scope }, "rate_limit_store_missing_in_production"),
});

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
