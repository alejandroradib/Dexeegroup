import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { ResetPasswordForm } from "@/components/domain/auth/password-forms";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
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
