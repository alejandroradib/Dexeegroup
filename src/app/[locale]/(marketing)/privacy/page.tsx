import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/domain/marketing/legal-page";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("privacy"),
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: { en: "/en/privacy", es: "/es/privacy" },
    },
  };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.meta");
  return <LegalPage doc="privacy" locale={locale} title={t("privacy")} />;
}
