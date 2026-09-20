import { BriefcaseIcon, LanguagesIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BookCallButton } from "@/components/domain/marketing/book-call-button";
import {
  ChevronList,
  FeatureCard,
  Section,
  SectionTitle,
  Steps,
} from "@/components/domain/marketing/sections";
import { Button } from "@/components/ui/button";
import { FOUNDING_CLIENT_PROGRAM } from "@/content/proof";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { buildAlternates } from "@/lib/seo/alternates";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("home"),
    description: t("defaultDescription"),
    alternates: buildAlternates(locale),
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.home");

  return (
    <>
      <Section tone="navy" className="py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="text-green mb-4 text-sm font-semibold tracking-wide uppercase">
            {t("intentLabel")}
          </p>
          <div className="mb-8 flex flex-wrap gap-2">
            <Button asChild variant="accent" size="sm">
              <Link href="/for-companies">{t("intentHire")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/for-talent">{t("intentJob")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/for-talent#assessments">{t("intentAssess")}</Link>
            </Button>
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">{t("heroSubtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/sign-up/company">{t("ctaPost")}</Link>
            </Button>
            <BookCallButton
              label={t("ctaCall")}
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            />
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
          <FeatureCard
            icon={BriefcaseIcon}
            title={t("serviceHeadhunting")}
            body={t("serviceHeadhuntingBody")}
          />
          <FeatureCard
            icon={UsersIcon}
            title={t("serviceStaffAug")}
            body={t("serviceStaffAugBody")}
          />
          <FeatureCard
            icon={LanguagesIcon}
            title={t("serviceEnglish")}
            body={t("serviceEnglishBody")}
          />
          <FeatureCard
            icon={SparklesIcon}
            title={t("serviceWorkstyle")}
            body={t("serviceWorkstyleBody")}
          />
        </div>
      </Section>

      <Section tone="navy">
        <SectionTitle
          title={t("foundingTitle")}
          subtitle={t("foundingBody", { seats: FOUNDING_CLIENT_PROGRAM.seats })}
        />
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {(["prioritySourcing", "lockedPrice", "extendedGuarantee"] as const).map((benefit) => (
            <li key={benefit} className="rounded-[12px] bg-white/5 p-6">
              <p className="text-green text-sm font-semibold">
                {t(`founding.${benefit}.title` as "founding.prioritySourcing.title", {
                  months: FOUNDING_CLIENT_PROGRAM.priceLockMonths,
                })}
              </p>
              <p className="mt-2 text-sm text-white/80">
                {t(`founding.${benefit}.body` as "founding.prioritySourcing.body", {
                  months: FOUNDING_CLIENT_PROGRAM.priceLockMonths,
                })}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-white/50">{t("foundingNote")}</p>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle title={t("guaranteesTitle")} />
            <ChevronList
              items={[t("guarantee1"), t("guarantee2"), t("guarantee3"), t("guarantee4")]}
            />
          </div>
          <div>
            <SectionTitle title={t("transparencyTitle")} />
            <ChevronList
              items={[
                t("transparency1"),
                t("transparency2"),
                t("transparency3"),
                t("transparency4"),
              ]}
            />
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <div className="rounded-[16px] bg-white p-8 text-center sm:p-12">
          <h2 className="text-2xl sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl">{t("ctaBody")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/sign-up/company">{t("ctaPost")}</Link>
            </Button>
            <BookCallButton label={t("ctaCall")} />
          </div>
        </div>
      </Section>
    </>
  );
}
