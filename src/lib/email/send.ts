import "server-only";

import { render } from "@react-email/components";
import { createElement } from "react";
import { Resend } from "resend";

import { BaseEmail, buildEmail } from "@emails/index";

import { publicEnv, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

import type { EmailLocale, TemplateName } from "@emails/copy";

let resend: Resend | undefined;

export function emailConfigured(): boolean {
  return Boolean(serverEnv().RESEND_API_KEY);
}

/**
 * Renders a template and sends it through Resend. Throws on provider errors so the outbox can
 * retry. Without a provider it renders (so template bugs still surface) and returns
 * `delivered: false`; the caller decides what that means, and the outbox parks the row rather
 * than calling it sent (audit G3).
 */
export async function sendTemplateEmail(input: {
  to: string;
  template: TemplateName;
  locale: EmailLocale;
  payload: Record<string, unknown>;
}): Promise<{ id: string | null; delivered: boolean }> {
  const env = serverEnv();
  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  const email = buildEmail(input.template, input.locale, input.payload, siteUrl);
  const html = await render(createElement(BaseEmail, email.props));
  const text = await render(createElement(BaseEmail, email.props), { plainText: true });
  if (!env.RESEND_API_KEY) {
    logger.warn(
      { to: input.to, template: input.template, subject: email.subject },
      "email_skipped_no_provider",
    );
    return { id: null, delivered: false };
  }
  resend ??= new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    replyTo: "info@dexeegroup.com",
    subject: email.subject,
    html,
    text,
  });
  if (error) throw new Error(`resend_${error.name}: ${error.message}`);
  return { id: data?.id ?? null, delivered: true };
}
