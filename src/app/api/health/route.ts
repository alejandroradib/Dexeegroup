import { NextResponse } from "next/server";

import { emailConfigured } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Liveness plus a database round trip. Also says whether an email provider is configured,
 * because a deployment without one silently sends nothing (audit G3). The key itself never
 * appears here, only the fact of its presence.
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
    return NextResponse.json(
      { status: "degraded", database: "error", email, error: (error as Error).message },
      { status: 503 },
    );
  }
}
