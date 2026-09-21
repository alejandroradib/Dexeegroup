import "server-only";

import { isTemplateName } from "@emails/copy";

import { backoffMinutes, MAX_SEND_ATTEMPTS } from "@/lib/email/backoff";
import { emailConfigured, sendTemplateEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/** `last_error` value that marks a row parked for lack of a provider, so it can be requeued. */
export const NO_PROVIDER = "no_provider";

export type OutboxRun = { sent: number; failed: number; skipped: number; requeued: number };

/**
 * Sends pending outbox rows. Each row is claimed with an optimistic lock on `attempts`, so two
 * overlapping cron runs never send the same email twice. Failures back off and give up after
 * MAX_SEND_ATTEMPTS.
 *
 * Without an email provider nothing is sent and nothing is called sent: claimed rows are
 * parked as `skipped` with `last_error = no_provider` and no `sent_at` (audit G3). The moment a
 * provider is configured, those rows are requeued first, so the backlog goes out on the next
 * run without anyone touching the database.
 */
export async function processOutbox(limit = 50): Promise<OutboxRun> {
  const admin = createAdminClient();
  const configured = emailConfigured();
  let requeued = 0;
  if (configured) {
    const { data: back } = await admin
      .from("email_outbox")
      .update({ status: "pending", attempts: 0, last_error: null })
      .eq("status", "skipped")
      .eq("last_error", NO_PROVIDER)
      .select("id");
    requeued = back?.length ?? 0;
    if (requeued > 0) logger.info({ requeued }, "outbox_requeued_after_provider_configured");
  }

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
    if (!configured) {
      // Parked, not sent. The claim above already bumped attempts; undo it so the requeue
      // starts the row clean.
      await admin
        .from("email_outbox")
        .update({ status: "skipped", last_error: NO_PROVIDER, attempts: row.attempts })
        .eq("id", row.id);
      skipped += 1;
      continue;
    }
    try {
      const result = await sendTemplateEmail({
        to: row.to,
        template: row.template,
        locale: row.locale,
        payload: (row.payload as Record<string, unknown>) ?? {},
      });
      if (!result.delivered) {
        // The provider vanished between the check above and the send; same treatment.
        await admin
          .from("email_outbox")
          .update({ status: "skipped", last_error: NO_PROVIDER, attempts: row.attempts })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }
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
  return { sent, failed, skipped, requeued };
}

export type EmailHealth = {
  /** Whether an email provider key is configured in this deployment. */
  providerConfigured: boolean;
  /** Pending rows older than fifteen minutes: the cron or the provider is not keeping up. */
  pendingOver15m: number;
  /** Rows that exhausted their retries in the last 24 hours. */
  failed24h: number;
  /** Rows parked because no provider was configured when they came due. */
  skippedNoProvider: number;
};

/**
 * Aggregate outbox health for the admin dashboard (audit G3). Counts only; no addresses or
 * payloads leave the database. The caller must already have verified the admin role.
 */
export async function getEmailHealth(): Promise<EmailHealth> {
  const admin = createAdminClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [pending, failed, skipped] = await Promise.all([
    admin
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", fifteenMinutesAgo),
    admin
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", dayAgo),
    admin
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "skipped")
      .eq("last_error", NO_PROVIDER),
  ]);
  return {
    providerConfigured: emailConfigured(),
    pendingOver15m: pending.count ?? 0,
    failed24h: failed.count ?? 0,
    skippedNoProvider: skipped.count ?? 0,
  };
}
