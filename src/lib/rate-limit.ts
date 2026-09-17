import "server-only";

import { createHash } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { serverEnv } from "@/lib/env";

type Window = { limit: number; windowSeconds: number };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(
  key: string,
  { limit, windowSeconds }: Window,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1 };
  }
  entry.count += 1;
  return { success: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

let upstash: Ratelimit | undefined;
function upstashLimiter(window: Window): Ratelimit | undefined {
  const env = serverEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return undefined;
  upstash ??= new Ratelimit({
    redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
    limiter: Ratelimit.slidingWindow(window.limit, `${window.windowSeconds} s`),
    prefix: "dexee",
  });
  return upstash;
}

/** Sliding-window rate limit: Upstash when configured, in-memory fallback otherwise. */
export async function rateLimit(
  scope: string,
  identifier: string,
  window: Window,
): Promise<{ success: boolean; remaining: number }> {
  const key = `${scope}:${identifier}`;
  const limiter = upstashLimiter(window);
  if (limiter) {
    const res = await limiter.limit(key);
    return { success: res.success, remaining: res.remaining };
  }
  return memoryLimit(key, window);
}

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
