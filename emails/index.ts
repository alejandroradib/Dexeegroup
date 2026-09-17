import { BaseEmail, type BaseEmailProps } from "./base-email";
import { EMAIL_COPY, fillTemplate, type EmailLocale, type TemplateName } from "./copy";

const FOOTER: Record<EmailLocale, string> = {
  en: "Dexee S.A.S., Barranquilla, Colombia. You receive this email because you have an account on the Dexee Talent Platform. Contact info@dexeegroup.com for help.",
  es: "Dexee S.A.S., Barranquilla, Colombia. Recibe este correo porque tiene una cuenta en la Plataforma de Talento Dexee. Escriba a info@dexeegroup.com si necesita ayuda.",
};

export type RenderedEmail = { subject: string; props: BaseEmailProps };

/** Builds subject and component props for a template in the recipient's locale. */
export function buildEmail(
  template: TemplateName,
  locale: EmailLocale,
  payload: Record<string, unknown>,
  siteUrl: string,
): RenderedEmail {
  const copy = EMAIL_COPY[template][locale];
  const link = typeof payload.link === "string" ? payload.link : "/";
  const ctaUrl = link.startsWith("http")
    ? link
    : `${siteUrl}${link.startsWith(`/${locale}`) ? link : `/${locale}${link}`}`;
  return {
    subject: fillTemplate(copy.subject, payload),
    props: {
      preview: fillTemplate(copy.subject, payload),
      heading: fillTemplate(copy.heading, payload),
      body: fillTemplate(copy.body, payload),
      ctaLabel: copy.cta,
      ctaUrl,
      footer: FOOTER[locale],
      logoUrl: `${siteUrl}/brand/email-logo.png`,
    },
  };
}

export { BaseEmail };
