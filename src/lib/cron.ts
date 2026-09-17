import "server-only";

import { serverEnv } from "@/lib/env";

import type { NextRequest } from "next/server";

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; manual calls may use `x-cron-secret`. */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = serverEnv().CRON_SECRET;
  const header = request.headers.get("authorization");
  const alt = request.headers.get("x-cron-secret");
  return header === `Bearer ${secret}` || alt === secret;
}
