import { LanguagesIcon, LockIcon, MicIcon, SparklesIcon, WalletIcon, FileCheckIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ChevronList, FeatureCard, Section, SectionTitle, Steps } from "@/components/domain/marketing/sections";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/for-talent">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("forTalent"),
    description: t("forTalentDescription"),
    alternates: { canonical: `/${locale}/for-talent`, languages: { en: "/en/for-talent", es: "/es/for-talent" } },
  };
}

export default async function ForTalentPage({ params }: PageProps<"/[locale]/for-talent">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.talent");
  const tc = await getTranslations("common");

  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("heroSubtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg"><Link href="/sign-up/candidate">{t("ctaTitle")}</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Link href="/jobs">{tc("footer.jobs")}</Link></Button>
          </div>
        </div>
      </Section>
      <Section>
        <SectionTitle title={t("valueTitle")} />
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard icon={WalletIcon} title={t("value1Title")} body={t("value1Body")} />
          <FeatureCard icon={LockIcon} title={t("value2Title")} body={t("value2Body")} />
          <FeatureCard icon={FileCheckIcon} title={t("value3Title")} body={t("value3Body")} />
        </div>
      </Section>
      <Section tone="mist" id="assessments">
        <SectionTitle title={t("assessmentsTitle")} subtitle={t("assessmentsIntro")} />
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard icon={LanguagesIcon} title={t("assessWrittenTitle")} body={t("assessWrittenBody")} />
          <FeatureCard icon={MicIcon} title={t("assessOralTitle")} body={t("assessOralBody")} />
          <FeatureCard icon={SparklesIcon} title={t("assessWorkstyleTitle")} body={t("assessWorkstyleBody")} />
        </div>
        <div className="mt-10 rounded-[12px] border border-border bg-white p-6">
          <h3 className="text-lg">{t("assessmentsReceive")}</h3>
          <ChevronList className="mt-4" items={[t("assessmentsReceive1"), t("assessmentsReceive2"), t("assessmentsReceive3")]} />
          <p className="mt-4 text-xs text-muted-foreground">{tc("consentNotice")}</p>
        </div>
      </Section>
      <Section>
        <SectionTitle title={t("howTitle")} />
        <Steps steps={[1, 2, 3, 4].map((n) => ({ label: String(n), body: t(`how${n}` as "how1") }))} />
      </Section>
      <Section tone="mist">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle title={t("faqTitle")} />
            <Accordion type="single" collapsible>
              {[1, 2, 3, 4].map((n) => (
                <AccordionItem key={n} value={`faq-${n}`}>
                  <AccordionTrigger>{t(`faq${n}Q` as "faq1Q")}</AccordionTrigger>
                  <AccordionContent>{t(`faq${n}A` as "faq1A")}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="rounded-[16px] bg-navy p-8 text-white sm:p-12">
            <h2 className="text-2xl text-white sm:text-3xl">{t("ctaTitle")}</h2>
            <p className="mt-3 text-white/80">{t("ctaBody")}</p>
            <Button asChild variant="accent" size="lg" className="mt-8"><Link href="/sign-up/candidate">{t("ctaTitle")}</Link></Button>
          </div>
        </div>
      </Section>
    </>
  );
}
