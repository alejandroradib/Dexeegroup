import "server-only";

import { safeEqual } from "@/lib/constant-time";
import { serverEnv } from "@/lib/env";

import type { NextRequest } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; manual calls may use `x-cron-secret`.
 * Compared in constant time (audit C4); `env.ts` already refuses a secret under 8 characters.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  const header = request.headers.get("authorization");
  const alt = request.headers.get("x-cron-secret");
  return safeEqual(header, `Bearer ${secret}`) || safeEqual(alt, secret);
}
