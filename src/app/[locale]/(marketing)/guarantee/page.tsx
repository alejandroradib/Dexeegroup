import { getTranslations } from "next-intl/server";

import { Section, SectionTitle, Steps } from "@/components/domain/marketing/sections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GUARANTEE } from "@/content/pricing";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guarantee">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("guarantee"),
    description: t("guaranteeDescription"),
    alternates: {
      canonical: `/${locale}/guarantee`,
      languages: { en: "/en/guarantee", es: "/es/guarantee" },
    },
  };
}

export default async function GuaranteePage({ params }: PageProps<"/[locale]/guarantee">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.guarantee");

  const steps = GUARANTEE.stepIds.map((id) => ({
    label: t(`steps.${id}.label` as "steps.notify.label"),
    body: t(`steps.${id}.body` as "steps.notify.body", {
      claimDays: GUARANTEE.claimWindowDays,
      responseDays: GUARANTEE.responseBusinessDays,
      shortlistDays: GUARANTEE.shortlistBusinessDays,
    }),
  }));

  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("subtitle")}</p>
        </div>
      </Section>

      <Section>
        <div className="max-w-3xl">
          <Alert variant="warning">
            <AlertDescription>{t("draftNotice")}</AlertDescription>
          </Alert>

          <h2 className="mt-12 text-2xl">{t("windowTitle")}</h2>
          <p className="mt-3 text-lg">
            {t("windowBody", {
              days: GUARANTEE.replacementDays,
              foundingDays: GUARANTEE.foundingReplacementDays,
            })}
          </p>
          <p className="text-muted-foreground mt-3">{t("windowFoundingNote")}</p>
        </div>
      </Section>

      <Section tone="mist">
        <SectionTitle title={t("stepsTitle")} />
        <Steps steps={steps} />
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl">{t("exclusionsTitle")}</h2>
            <p className="text-muted-foreground mt-3">{t("exclusionsIntro")}</p>
            <ul className="mt-6 space-y-4">
              {GUARANTEE.exclusionIds.map((id) => (
                <li key={id} className="border-border border-l-2 pl-4 text-sm">
                  {t(`exclusions.${id}` as "exclusions.roleChanged")}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl">{t("remedyTitle")}</h2>
            <p className="mt-3">
              {t("remedyBody", { shortlistDays: GUARANTEE.shortlistBusinessDays })}
            </p>
            <p className="text-muted-foreground mt-3 text-sm">{t("remedyNote")}</p>

            <h2 className="mt-12 text-2xl">{t("questionsTitle")}</h2>
            <p className="mt-3">{t("questionsBody")}</p>
            <Button asChild variant="accent" className="mt-6">
              <Link href="/contact">{t("questionsCta")}</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
