import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { ForgotPasswordForm } from "@/components/domain/auth/password-forms";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/forgot-password">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("forgotPassword"), robots: { index: false } };
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  await pageLocale(params);
  const t = await getTranslations("auth.forgot");
  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")} footer={<Link href="/sign-in" className="font-semibold text-link hover:underline">{t("backToSignIn")}</Link>}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
