import { getTranslations } from "next-intl/server";

import { ChevronList, Section, SectionTitle } from "@/components/domain/marketing/sections";
import { VerificationSteps } from "@/components/domain/marketing/verification-steps";
import { Button } from "@/components/ui/button";
import { EVIDENCE } from "@/content/proof";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { dateOnly } from "@/lib/utils";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/how-we-verify">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("howWeVerify"),
    description: t("howWeVerifyDescription"),
    alternates: buildAlternates(locale, "/how-we-verify"),
  };
}

export default async function HowWeVerifyPage({ params }: PageProps<"/[locale]/how-we-verify">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.verify");
  const dateFormat = new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <>
      <Section tone="navy" className="py-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("subtitle")}</p>
          <Button asChild variant="accent" size="lg" className="mt-10">
            <Link href="/sample-report">{t("reportCta")}</Link>
          </Button>
        </div>
      </Section>

      <Section tone="mist">
        <SectionTitle title={t("problemTitle")} subtitle={t("problemBody")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {EVIDENCE.map((item) => (
            <li key={item.id} className="border-border rounded-[12px] border bg-white p-6">
              <p className="text-sm">
                {t(`evidence.${item.id}` as "evidence.ftc-job-scam-losses")}
              </p>
              <p className="text-muted-foreground mt-4 text-xs">
                {t("evidenceSourceLabel")}:{" "}
                <a
                  className="text-link underline"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                >
                  {item.publisher}
                </a>
                , {dateFormat.format(dateOnly(item.date))}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionTitle title={t("title")} />
        <VerificationSteps />
      </Section>

      <Section tone="navy">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl sm:text-3xl">{t("humanTitle")}</h2>
            <p className="mt-4 text-white/80">{t("humanBody")}</p>
          </div>
          <ChevronList
            items={[
              t("humanPoints.impersonation"),
              t("humanPoints.override"),
              t("humanPoints.keys"),
              t("humanPoints.reuse"),
            ]}
          />
        </div>
      </Section>

      <Section tone="mist">
        <div className="rounded-[16px] bg-white p-8 text-center sm:p-12">
          <h2 className="text-2xl sm:text-3xl">{t("reportTitle")}</h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl">{t("reportBody")}</p>
          <Button asChild variant="accent" size="lg" className="mt-8">
            <Link href="/sample-report">{t("reportCta")}</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
