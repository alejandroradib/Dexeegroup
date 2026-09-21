import "server-only";

import { headers } from "next/headers";

import { pickClientIp } from "@/lib/client-ip";

/** Client IP behind Vercel or another proxy; see pickClientIp for the header order (audit C5). */
export async function clientIp(): Promise<string> {
  return pickClientIp(await headers());
}
