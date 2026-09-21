import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { ResetPasswordForm } from "@/components/domain/auth/password-forms";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

/**
 * Rendered per request, not at build time: the proxy issues a CSP nonce per response and
 * Next.js can only stamp it on inline scripts when the page renders on demand (audit H1). A
 * prerendered copy would ship scripts without the nonce and the browser would block them.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("resetPassword"), robots: { index: false } };
}

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  await pageLocale(params);
  const t = await getTranslations("auth.reset");
  return (
    <AuthCard title={t("title")}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
