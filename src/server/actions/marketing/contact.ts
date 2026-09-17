"use server";

import { getLocale } from "next-intl/server";

import { logger } from "@/lib/logger";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema } from "@/lib/validation/contact";
import { ERR, err, ok, type Result } from "@/server/services/result";

export async function submitContactRequest(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  // Honeypot filled: pretend success without storing anything.
  if (parsed.data.website) return ok({ id: "ignored" });

  const ip = await clientIp();
  const limit = await rateLimit("contact", hashIdentifier(ip), { limit: 5, windowSeconds: 3600 });
  if (!limit.success) return err(ERR.rateLimited);

  const locale = (await getLocale()) === "es" ? "es" : "en";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      request_type: parsed.data.request_type,
      message: parsed.data.message,
      locale,
      ip_hash: hashIdentifier(ip),
    })
    .select("id")
    .single();
  if (error) {
    logger.error({ err: error.message }, "contact_request_insert_failed");
    return err(ERR.generic);
  }
  return ok({ id: data.id });
}
