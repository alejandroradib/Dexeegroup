import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { SignUpCompanyForm } from "@/components/domain/auth/sign-up-company-form";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-up/company">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("signUpCompany"), robots: { index: false } };
}

export default async function SignUpCompanyPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-up/company">) {
  await pageLocale(params);
  const query = await searchParams;
  const t = await getTranslations("auth.signUpCompany");
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <p>
          {t("candidateInstead")}{" "}
          <Link href="/sign-up/candidate" className="text-link font-semibold hover:underline">
            {t("candidateLink")}
          </Link>
        </p>
      }
    >
      <SignUpCompanyForm next={typeof query.next === "string" ? query.next : undefined} />
    </AuthCard>
  );
}
