import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCron } from "@/lib/cron";
import { logger } from "@/lib/logger";
import { processPendingAttempts } from "@/server/services/assessments";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await processPendingAttempts();
    logger.info(result, "cron_process_attempts");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error({ err: (error as Error).message }, "cron_process_attempts_failed");
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
