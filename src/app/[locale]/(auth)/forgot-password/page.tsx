import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { ForgotPasswordForm } from "@/components/domain/auth/password-forms";
import { Link } from "@/i18n/navigation";
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
}: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("forgotPassword"), robots: { index: false } };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  await pageLocale(params);
  const t = await getTranslations("auth.forgot");
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <Link href="/sign-in" className="text-link font-semibold hover:underline">
          {t("backToSignIn")}
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
