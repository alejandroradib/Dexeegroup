import { getTranslations } from "next-intl/server";

import { BookCallButton } from "@/components/domain/marketing/book-call-button";
import { CostCalculator } from "@/components/domain/marketing/cost-calculator";
import { PricingTable } from "@/components/domain/marketing/pricing-table";
import { Section, SectionTitle } from "@/components/domain/marketing/sections";
import { Button } from "@/components/ui/button";
import { GUARANTEE, hasProvisionalPricing } from "@/content/pricing";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("pricing"),
    description: t("pricingDescription"),
    alternates: {
      canonical: `/${locale}/pricing`,
      languages: { en: "/en/pricing", es: "/es/pricing" },
    },
  };
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.pricing");

  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("subtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/sign-up/company">{t("ctaStart")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/guarantee">{t("ctaGuarantee")}</Link>
            </Button>
            <BookCallButton
              label={t("bookCta")}
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            />
          </div>
        </div>
      </Section>

      <Section>
        <PricingTable locale={locale} />
        {hasProvisionalPricing() ? (
          <p className="text-muted-foreground mt-8 max-w-3xl text-sm">{t("provisionalNote")}</p>
        ) : null}
      </Section>

      <Section tone="mist">
        <SectionTitle title={t("calculatorTitle")} subtitle={t("calculatorSubtitle")} />
        <CostCalculator />
      </Section>

      <Section>
        <div className="border-border rounded-[16px] border p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl">{t("guaranteeTeaserTitle")}</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            {t("guaranteeTeaserBody", { days: GUARANTEE.replacementDays })}
          </p>
          <Button asChild variant="accent" className="mt-6">
            <Link href="/guarantee">{t("guaranteeTeaserCta")}</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
