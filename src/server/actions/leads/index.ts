"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { leadSchema } from "@/lib/validation/lead";
import { logAdminActivity } from "@/server/services/admin-activity";
import { dispatchEvent } from "@/server/services/events";
import { ERR, err, ok, type Result } from "@/server/services/result";

/**
 * Inbound lead capture (PHASES-GTM 9.4).
 *
 * The lead is the thing that must not be lost, so the insert happens first and on its own.
 * The admin notification and the acknowledgement email are queued afterwards and their
 * failures are logged, never returned: a Resend outage must not cost Dexee the lead, and
 * the visitor has already been told their request arrived.
 */
export async function createLead(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  // Honeypot filled: report success and store nothing, so a bot learns nothing.
  if (parsed.data.website) return ok({ id: "ignored" });

  const ip = await clientIp();
  const limit = await rateLimit("lead", hashIdentifier(ip), { limit: 5, windowSeconds: 3600 });
  if (!limit.success) return err(ERR.rateLimited);

  const locale = (await getLocale()) === "es" ? "es" : "en";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contact_requests")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      request_type: "hire",
      role_to_fill: parsed.data.role_to_fill,
      seniority: parsed.data.seniority,
      budget_band: parsed.data.budget_band,
      needed_by: parsed.data.needed_by,
      status: "new",
      locale,
      ip_hash: hashIdentifier(ip),
    })
    .select("id")
    .single();
  if (error) {
    logger.error({ err: error.message }, "lead_insert_failed");
    return err(ERR.generic);
  }

  // From here the lead is safe. Nothing below can fail the submission.
  const { error: outboxError } = await admin.from("email_outbox").upsert(
    [
      {
        to: parsed.data.email,
        template: "lead-acknowledgement",
        locale,
        // Neutral acknowledgement (audit I16): nothing the sender typed is echoed back, so the
        // form cannot be used to deliver arbitrary text from Dexee's domain.
        payload: { link: "/pricing" },
        dedupe_key: `lead:${data.id}`,
      },
    ],
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );
  if (outboxError) {
    logger.error({ err: outboxError.message, lead: data.id }, "lead_acknowledgement_queue_failed");
  }
  await dispatchEvent({ type: "lead_received", leadId: data.id });

  return ok({ id: data.id });
}

const convertSchema = z.object({ lead_id: z.uuid(), company_id: z.uuid() });
const statusSchema = z.object({
  lead_id: z.uuid(),
  status: z.enum(["new", "answered", "discarded"]),
});

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

function revalidateLeads() {
  revalidatePath("/[locale]/admin/leads", "page");
}

/**
 * Records that the lead was answered. `answered_at` and `answered_by` are set by the
 * database guard so the response-time report cannot be written around.
 */
export async function setLeadStatus(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireAdmin();
  if (!user) return err(ERR.unauthorized);
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_requests")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.lead_id);
  if (error) {
    logger.error({ err: error.message, lead: parsed.data.lead_id }, "lead_status_update_failed");
    return err(ERR.generic);
  }
  await logAdminActivity({
    actorUserId: user.id,
    action: "lead_status",
    entityType: "contact_request",
    entityId: parsed.data.lead_id,
    metadata: { status: parsed.data.status },
  });
  revalidateLeads();
  return ok({ id: parsed.data.lead_id });
}

/** Links an answered lead to the company record it turned into. */
export async function convertLeadToCompany(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireAdmin();
  if (!user) return err(ERR.unauthorized);
  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) {
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_requests")
    .update({ status: "converted", company_id: parsed.data.company_id })
    .eq("id", parsed.data.lead_id);
  if (error) {
    logger.error({ err: error.message, lead: parsed.data.lead_id }, "lead_convert_failed");
    return err(ERR.generic);
  }
  await logAdminActivity({
    actorUserId: user.id,
    action: "lead_converted",
    entityType: "contact_request",
    entityId: parsed.data.lead_id,
    metadata: { company_id: parsed.data.company_id },
  });
  revalidateLeads();
  return ok({ id: parsed.data.lead_id });
}
