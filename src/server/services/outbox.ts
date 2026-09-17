import "server-only";

import { isTemplateName } from "@emails/copy";

import { backoffMinutes, MAX_SEND_ATTEMPTS } from "@/lib/email/backoff";
import { sendTemplateEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sends pending outbox rows. Each row is claimed with an optimistic lock on `attempts`, so two
 * overlapping cron runs never send the same email twice. Failures back off and give up after
 * MAX_SEND_ATTEMPTS.
 */
export async function processOutbox(
  limit = 50,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: rows } = await admin
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("created_at")
    .limit(limit);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    const { data: claimed } = await admin
      .from("email_outbox")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("attempts", row.attempts)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      skipped += 1;
      continue;
    }
    if (!isTemplateName(row.template)) {
      await admin
        .from("email_outbox")
        .update({ status: "failed", last_error: "unknown_template" })
        .eq("id", row.id);
      failed += 1;
      continue;
    }
    try {
      await sendTemplateEmail({
        to: row.to,
        template: row.template,
        locale: row.locale,
        payload: (row.payload as Record<string, unknown>) ?? {},
      });
      await admin
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", row.id);
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const message = (error as Error).message;
      logger.warn({ err: message, id: row.id, attempts }, "outbox_send_failed");
      if (attempts >= MAX_SEND_ATTEMPTS) {
        await admin
          .from("email_outbox")
          .update({ status: "failed", last_error: message })
          .eq("id", row.id);
        failed += 1;
      } else {
        await admin
          .from("email_outbox")
          .update({
            last_error: message,
            scheduled_for: new Date(Date.now() + backoffMinutes(attempts) * 60_000).toISOString(),
          })
          .eq("id", row.id);
      }
    }
  }
  return { sent, failed, skipped };
}
