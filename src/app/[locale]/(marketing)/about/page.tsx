import { getTranslations } from "next-intl/server";

import {
  ChevronList,
  FeatureCard,
  Section,
  SectionTitle,
} from "@/components/domain/marketing/sections";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("about"),
    description: t("aboutDescription"),
    alternates: { canonical: `/${locale}/about`, languages: { en: "/en/about", es: "/es/about" } },
  };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.about");
  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("heroSubtitle")}</p>
        </div>
      </Section>
      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl">{t("purposeTitle")}</h2>
            <p className="mt-3 text-lg">{t("purposeBody")}</p>
          </div>
          <div>
            <h2 className="text-2xl">{t("promiseTitle")}</h2>
            <p className="mt-3 text-lg">{t("promiseBody")}</p>
          </div>
        </div>
      </Section>
      <Section tone="mist">
        <SectionTitle title={t("servicesTitle")} />
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard title={t("searchTitle")} body={t("searchBody")} />
          <FeatureCard title={t("teamsTitle")} body={t("teamsBody")} />
          <FeatureCard title={t("backOfficeTitle")} body={t("backOfficeBody")} />
        </div>
      </Section>
      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle title={t("valuesTitle")} />
            <dl className="grid gap-6 sm:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n}>
                  <dt className="font-heading text-navy text-lg font-bold">
                    {t(`value${n}Title` as "value1Title")}
                  </dt>
                  <dd className="mt-1 text-sm">{t(`value${n}Body` as "value1Body")}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <SectionTitle title={t("whyTitle")} />
            <ChevronList items={[t("why1"), t("why2"), t("why3")]} />
            <h3 className="mt-10 text-lg">{t("legalTitle")}</h3>
            <p className="text-muted-foreground mt-2 text-sm">{t("legalBody")}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
