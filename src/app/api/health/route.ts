import { NextResponse } from "next/server";

import { emailConfigured } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Liveness plus a database round trip. Also says whether an email provider is configured,
 * because a deployment without one silently sends nothing (audit G3). The key itself never
 * appears here, only the fact of its presence, and a failure reports no detail.
 */
export async function GET() {
  const started = Date.now();
  const email = emailConfigured() ? "configured" : "unconfigured";
  try {
    const { error } = await createAdminClient()
      .from("assessments")
      .select("id", { head: true, count: "exact" });
    if (error) throw error;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      email,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    // The reason goes to the log, never to an unauthenticated caller (audit I19).
    logger.error({ err: (error as Error).message }, "health_check_failed");
    return NextResponse.json({ status: "degraded", database: "error", email }, { status: 503 });
  }
}
