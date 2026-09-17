import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/domain/marketing/legal-page";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return { title: t("terms"), alternates: { canonical: `/${locale}/terms`, languages: { en: "/en/terms", es: "/es/terms" } } };
}

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.meta");
  return <LegalPage doc="terms" locale={locale} title={t("terms")} />;
}
