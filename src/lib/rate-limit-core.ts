/**
 * Rate limiting without I/O (audit I12). `rate-limit.ts` wires this to Upstash and the
 * environment; this module holds the parts a unit test can drive: the in-memory fallback, the
 * per-window limiter registry and the production fail-closed rule.
 */

export type RateWindow = { limit: number; windowSeconds: number };
export type RateLimitResult = { success: boolean; remaining: number };

type MemoryEntry = { count: number; resetAt: number };

/**
 * Fixed window per key for one process. Entries die with their window; a sweep runs at most
 * once a minute so an idle process does not keep every key it ever saw.
 */
export class MemoryRateLimiter {
  private readonly entries = new Map<string, MemoryEntry>();
  private lastSweep = 0;

  constructor(private readonly now: () => number = Date.now) {}

  limit(key: string, window: RateWindow): RateLimitResult {
    const now = this.now();
    this.sweep(now);
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + window.windowSeconds * 1000 });
      return { success: true, remaining: window.limit - 1 };
    }
    entry.count += 1;
    return {
      success: entry.count <= window.limit,
      remaining: Math.max(0, window.limit - entry.count),
    };
  }

  get size(): number {
    return this.entries.size;
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(key);
  }
}

/** One shared limiter per distinct window, so two scopes with different limits never share one. */
export function windowKey(window: RateWindow): string {
  return `${window.limit}:${window.windowSeconds}`;
}

export type SharedLimiter = { limit: (key: string) => Promise<RateLimitResult> };

export type RateLimitDeps = {
  /** The shared store's limiter for this window, or undefined when no store is configured. */
  shared: (window: RateWindow) => SharedLimiter | undefined;
  memory: MemoryRateLimiter;
  /** In production a missing shared store denies instead of falling back to one process's memory. */
  production: boolean;
  onStoreMissing: (scope: string) => void;
};

export function createRateLimit(deps: RateLimitDeps) {
  let reported = false;
  return async function rateLimit(
    scope: string,
    identifier: string,
    window: RateWindow,
  ): Promise<RateLimitResult> {
    const key = `${scope}:${identifier}`;
    const limiter = deps.shared(window);
    if (limiter) return limiter.limit(key);
    if (deps.production) {
      if (!reported) {
        reported = true;
        deps.onStoreMissing(scope);
      }
      return { success: false, remaining: 0 };
    }
    return deps.memory.limit(key, window);
  };
}
