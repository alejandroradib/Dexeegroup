import { MailCheckIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { ResendVerificationButton } from "@/components/domain/auth/password-forms";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/verify-email">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("verifyEmail"), robots: { index: false } };
}

export default async function VerifyEmailPage({ params, searchParams }: PageProps<"/[locale]/verify-email">) {
  await pageLocale(params);
  const query = await searchParams;
  const email = typeof query.email === "string" ? query.email : undefined;
  const t = await getTranslations("auth.verify");
  return (
    <AuthCard title={t("title")} footer={<Link href="/sign-in" className="font-semibold text-link hover:underline">{t("backToSignIn")}</Link>}>
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-mint text-navy"><MailCheckIcon className="size-6" aria-hidden /></span>
        <p className="text-sm">{email ? t("body", { email }) : t("bodyNoEmail")}</p>
        <p className="text-xs text-muted-foreground">{t("spam")}</p>
        {email ? <ResendVerificationButton email={email} /> : null}
      </div>
    </AuthCard>
  );
}
