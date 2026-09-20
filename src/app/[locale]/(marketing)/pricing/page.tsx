import { getTranslations } from "next-intl/server";

import { BookCallButton } from "@/components/domain/marketing/book-call-button";
import { CostCalculator } from "@/components/domain/marketing/cost-calculator";
import { LeadForm } from "@/components/domain/marketing/lead-form";
import { PricingTable } from "@/components/domain/marketing/pricing-table";
import { Section, SectionTitle } from "@/components/domain/marketing/sections";
import { TrackView } from "@/components/shared/track-view";
import { Button } from "@/components/ui/button";
import { GUARANTEE, hasProvisionalPricing } from "@/content/pricing";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { buildAlternates } from "@/lib/seo/alternates";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("pricing"),
    description: t("pricingDescription"),
    alternates: buildAlternates(locale, "/pricing"),
  };
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.pricing");
  const tl = await getTranslations("marketing.lead");

  return (
    <>
      <TrackView event="view_pricing" />
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
        <div className="border-border mt-10 flex flex-wrap items-center gap-4 rounded-[12px] border p-6">
          <p className="text-muted-foreground grow text-sm">{t("sampleReportBody")}</p>
          <Button asChild variant="outline">
            <Link href="/sample-report">{t("sampleReportCta")}</Link>
          </Button>
        </div>
        {hasProvisionalPricing() ? (
          <p className="text-muted-foreground mt-8 max-w-3xl text-sm">{t("provisionalNote")}</p>
        ) : null}
      </Section>

      <Section tone="mist">
        <SectionTitle title={t("calculatorTitle")} subtitle={t("calculatorSubtitle")} />
        <CostCalculator />
      </Section>

      <Section tone="mist" id="brief">
        <div className="mx-auto max-w-3xl">
          <SectionTitle title={tl("title")} subtitle={tl("subtitle")} />
          <div className="border-border rounded-[16px] border bg-white p-8">
            <LeadForm />
          </div>
        </div>
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
