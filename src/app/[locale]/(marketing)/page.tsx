import { BriefcaseIcon, LanguagesIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ChevronList, FeatureCard, Metric, Section, SectionTitle, Steps } from "@/components/domain/marketing/sections";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { serverEnv } from "@/lib/env";
import { SITE_METRICS, TESTIMONIALS } from "@/lib/site";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("home"),
    description: t("defaultDescription"),
    alternates: { canonical: `/${locale}`, languages: { en: "/en", es: "/es", "x-default": "/en" } },
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.home");
  const calendly = serverEnv().CALENDLY_URL;

  return (
    <>
      <Section tone="navy" className="py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold tracking-wide text-green uppercase">{t("intentLabel")}</p>
          <div className="mb-8 flex flex-wrap gap-2">
            <Button asChild variant="accent" size="sm"><Link href="/for-companies">{t("intentHire")}</Link></Button>
            <Button asChild variant="outline" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Link href="/for-talent">{t("intentJob")}</Link></Button>
            <Button asChild variant="outline" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Link href="/for-talent#assessments">{t("intentAssess")}</Link></Button>
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">{t("heroSubtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg"><Link href="/sign-up/company">{t("ctaPost")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <a href={calendly} target="_blank" rel="noreferrer">{t("ctaCall")}</a>
            </Button>
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <SectionTitle title={t("timelineTitle")} />
        <Steps
          steps={[
            { label: t("timelineTodayLabel"), body: t("timelineToday") },
            { label: t("timelineDaysLabel"), body: t("timelineDays") },
            { label: t("timelineWeeksLabel"), body: t("timelineWeeks") },
          ]}
        />
      </Section>

      <Section>
        <SectionTitle title={t("servicesTitle")} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={BriefcaseIcon} title={t("serviceHeadhunting")} body={t("serviceHeadhuntingBody")} />
          <FeatureCard icon={UsersIcon} title={t("serviceStaffAug")} body={t("serviceStaffAugBody")} />
          <FeatureCard icon={LanguagesIcon} title={t("serviceEnglish")} body={t("serviceEnglishBody")} />
          <FeatureCard icon={SparklesIcon} title={t("serviceWorkstyle")} body={t("serviceWorkstyleBody")} />
        </div>
      </Section>

      <Section tone="navy">
        <SectionTitle title={t("metricsTitle")} />
        <div className="grid gap-6 sm:grid-cols-3">
          <Metric value={SITE_METRICS.candidatesInDatabase.toLocaleString(locale === "es" ? "es-CO" : "en-US")} label={t("metricCandidates")} />
          <Metric value={String(SITE_METRICS.averageDaysToShortlist)} label={t("metricDays")} />
          <Metric value={`${SITE_METRICS.clientRetentionPercent}%`} label={t("metricRetention")} />
        </div>
        <p className="mt-6 text-xs text-white/50">{t("metricsNote")}</p>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle title={t("guaranteesTitle")} />
            <ChevronList items={[t("guarantee1"), t("guarantee2"), t("guarantee3"), t("guarantee4")]} />
          </div>
          <div>
            <SectionTitle title={t("testimonialsTitle")} />
            <div className="space-y-4">
              {TESTIMONIALS.map((item) => (
                <blockquote key={item.author} className="rounded-[12px] border border-border bg-mist p-6">
                  <p className="text-base text-navy">“{item.quote}”</p>
                  <footer className="mt-3 text-sm text-muted-foreground">{item.author}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <div className="rounded-[16px] bg-white p-8 text-center sm:p-12">
          <h2 className="text-2xl sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("ctaBody")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg"><Link href="/sign-up/company">{t("ctaPost")}</Link></Button>
            <Button asChild variant="outline" size="lg"><a href={calendly} target="_blank" rel="noreferrer">{t("ctaCall")}</a></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
