import { ClockIcon, ShieldCheckIcon, UsersIcon, WalletIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BookCallButton } from "@/components/domain/marketing/book-call-button";
import { BuyerFaq } from "@/components/domain/marketing/buyer-faq";
import { LeadForm } from "@/components/domain/marketing/lead-form";
import { PricingSummary } from "@/components/domain/marketing/pricing-table";
import { FeatureCard, Section, SectionTitle, Steps } from "@/components/domain/marketing/sections";
import { Button } from "@/components/ui/button";
import { EVIDENCE } from "@/content/proof";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { CONTRACT_TYPES } from "@/lib/validation/enums";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/for-companies">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("forCompanies"),
    description: t("forCompaniesDescription"),
    alternates: buildAlternates(locale, "/for-companies"),
  };
}

export default async function ForCompaniesPage({ params }: PageProps<"/[locale]/for-companies">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.companies");
  const te = await getTranslations("enums");
  const tv = await getTranslations("marketing.verify");
  const tl = await getTranslations("marketing.lead");
  const evidenceDate = new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("heroSubtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/sign-up/company">{t("ctaTitle")}</Link>
            </Button>
            <BookCallButton
              label={t("pricingCta")}
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            />
          </div>
        </div>
      </Section>
      <Section>
        <SectionTitle title={t("valueTitle")} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={ClockIcon} title={t("value1Title")} body={t("value1Body")} />
          <FeatureCard icon={UsersIcon} title={t("value2Title")} body={t("value2Body")} />
          <FeatureCard icon={ShieldCheckIcon} title={t("value3Title")} body={t("value3Body")} />
          <FeatureCard icon={WalletIcon} title={t("value4Title")} body={t("value4Body")} />
        </div>
      </Section>
      <Section tone="mist">
        <SectionTitle title={t("howTitle")} />
        <Steps
          steps={[1, 2, 3, 4].map((n) => ({
            label: String(n),
            title: t(`how${n}Title` as "how1Title"),
            body: t(`how${n}Body` as "how1Body"),
          }))}
        />
      </Section>
      <Section>
        <SectionTitle title={t("contractsTitle")} />
        <div className="grid gap-6 sm:grid-cols-2">
          {CONTRACT_TYPES.map((type) => (
            <FeatureCard
              key={type}
              title={te(`contract_type.${type}`)}
              body={te(`contract_type_description.${type}`)}
            />
          ))}
        </div>
      </Section>
      <Section id="verification" tone="navy">
        <SectionTitle title={tv("title")} subtitle={tv("problemBody")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {EVIDENCE.map((item) => (
            <li key={item.id} className="rounded-[12px] bg-white/5 p-6">
              <p className="text-sm text-white/90">
                {tv(`evidence.${item.id}` as "evidence.ftc-job-scam-losses")}
              </p>
              <p className="mt-4 text-xs text-white/60">
                {tv("evidenceSourceLabel")}:{" "}
                <a
                  className="text-green underline"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                >
                  {item.publisher}
                </a>
                , {evidenceDate.format(new Date(item.date))}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-3xl text-white/80">{tv("humanBody")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="accent">
            <Link href="/how-we-verify">{t("verificationCta")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            <Link href="/sample-report">{tv("reportCta")}</Link>
          </Button>
        </div>
      </Section>
      <Section tone="mist">
        <SectionTitle title={t("pricingTitle")} subtitle={t("pricingBody")} />
        <PricingSummary locale={locale} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="accent">
            <Link href="/pricing">{t("pricingSeeAll")}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/guarantee">{t("pricingGuaranteeCta")}</Link>
          </Button>
        </div>
      </Section>
      <Section id="faq">
        <div className="mx-auto max-w-3xl">
          <SectionTitle title={t("faqTitle")} subtitle={t("faqSubtitle")} />
          <BuyerFaq />
        </div>
      </Section>
      <Section id="brief" tone="mist">
        <div className="mx-auto max-w-3xl">
          <SectionTitle title={tl("title")} subtitle={tl("subtitle")} />
          <div className="border-border rounded-[16px] border bg-white p-8">
            <LeadForm />
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            {t.rich("briefOrSignUp", {
              link: (chunks) => (
                <Link className="text-link underline" href="/sign-up/company">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </Section>
    </>
  );
}
