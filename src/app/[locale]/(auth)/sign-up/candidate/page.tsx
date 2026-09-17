import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { SignUpCandidateForm } from "@/components/domain/auth/sign-up-candidate-form";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/sign-up/candidate">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("signUpCandidate"), robots: { index: false } };
}

export default async function SignUpCandidatePage({ params, searchParams }: PageProps<"/[locale]/sign-up/candidate">) {
  await pageLocale(params);
  const query = await searchParams;
  const t = await getTranslations("auth.signUpCandidate");
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={<p>{t("companyInstead")} <Link href="/sign-up/company" className="font-semibold text-link hover:underline">{t("companyLink")}</Link></p>}
    >
      <SignUpCandidateForm next={typeof query.next === "string" ? query.next : undefined} />
    </AuthCard>
  );
}
