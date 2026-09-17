import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Liveness plus a database round trip. */
export async function GET() {
  const started = Date.now();
  try {
    const { error } = await createAdminClient()
      .from("assessments")
      .select("id", { head: true, count: "exact" });
    if (error) throw error;
    return NextResponse.json({ status: "ok", database: "ok", latencyMs: Date.now() - started });
  } catch (error) {
    return NextResponse.json(
      { status: "degraded", database: "error", error: (error as Error).message },
      { status: 503 },
    );
  }
}
