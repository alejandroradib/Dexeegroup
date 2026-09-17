import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { SignInForm } from "@/components/domain/auth/sign-in-form";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("signIn"), robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  await pageLocale(params);
  const query = await searchParams;
  const next = typeof query.next === "string" ? query.next : undefined;
  const t = await getTranslations("auth.signIn");
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <p>
          {t("noAccount")} <Link href="/sign-up" className="font-semibold text-link hover:underline">{t("createAccount")}</Link>
        </p>
      }
    >
      <SignInForm next={next} />
    </AuthCard>
  );
}
