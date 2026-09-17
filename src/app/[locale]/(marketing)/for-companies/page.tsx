import { ClockIcon, ShieldCheckIcon, UsersIcon, WalletIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { FeatureCard, Section, SectionTitle, Steps } from "@/components/domain/marketing/sections";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { serverEnv } from "@/lib/env";
import { CONTRACT_TYPES } from "@/lib/validation/enums";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/for-companies">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("forCompanies"),
    description: t("forCompaniesDescription"),
    alternates: { canonical: `/${locale}/for-companies`, languages: { en: "/en/for-companies", es: "/es/for-companies" } },
  };
}

export default async function ForCompaniesPage({ params }: PageProps<"/[locale]/for-companies">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.companies");
  const te = await getTranslations("enums");
  const calendly = serverEnv().CALENDLY_URL;
  const faqs = [1, 2, 3, 4, 5] as const;

  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("heroSubtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg"><Link href="/sign-up/company">{t("ctaTitle")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10"><a href={calendly} target="_blank" rel="noreferrer">{t("pricingCta")}</a></Button>
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
        <Steps steps={[1, 2, 3, 4].map((n) => ({ label: String(n), title: t(`how${n}Title` as "how1Title"), body: t(`how${n}Body` as "how1Body") }))} />
      </Section>
      <Section>
        <SectionTitle title={t("contractsTitle")} />
        <div className="grid gap-6 sm:grid-cols-2">
          {CONTRACT_TYPES.map((type) => (
            <FeatureCard key={type} title={te(`contract_type.${type}`)} body={te(`contract_type_description.${type}`)} />
          ))}
        </div>
      </Section>
      <Section tone="mist">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle title={t("pricingTitle")} subtitle={t("pricingBody")} />
            <Button asChild variant="accent"><a href={calendly} target="_blank" rel="noreferrer">{t("pricingCta")}</a></Button>
          </div>
          <div>
            <SectionTitle title={t("faqTitle")} />
            <Accordion type="single" collapsible>
              {faqs.map((n) => (
                <AccordionItem key={n} value={`faq-${n}`}>
                  <AccordionTrigger>{t(`faq${n}Q` as "faq1Q")}</AccordionTrigger>
                  <AccordionContent>{t(`faq${n}A` as "faq1A")}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Section>
      <Section>
        <div className="rounded-[16px] bg-navy p-8 text-white sm:p-12">
          <h2 className="text-2xl text-white sm:text-3xl">{t("ctaTitle")}</h2>
          <p className="mt-3 max-w-xl text-white/80">{t("ctaBody")}</p>
          <Button asChild variant="accent" size="lg" className="mt-8"><Link href="/sign-up/company">{t("ctaTitle")}</Link></Button>
        </div>
      </Section>
    </>
  );
}
