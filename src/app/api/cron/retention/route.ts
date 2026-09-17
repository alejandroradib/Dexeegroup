import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCron } from "@/lib/cron";
import { logger } from "@/lib/logger";
import { purgeOldAudio } from "@/server/services/assessments";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Deletes assessment audio twelve months after validation (SPEC 15 retention rule). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const removed = await purgeOldAudio();
    logger.info({ removed }, "cron_retention");
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    logger.error({ err: (error as Error).message }, "cron_retention_failed");
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
