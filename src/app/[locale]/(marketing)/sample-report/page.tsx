import { getTranslations } from "next-intl/server";

import { Section } from "@/components/domain/marketing/sections";
import { TrackView } from "@/components/shared/track-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SAMPLE_CANDIDATE,
  SAMPLE_CHECKS,
  SAMPLE_EXCLUDED_FIELDS,
  SAMPLE_ORAL_DECISION,
  SAMPLE_ORAL_RUBRIC,
  SAMPLE_WORKSTYLE,
} from "@/content/sample-report";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { dateOnly } from "@/lib/utils";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sample-report">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("sampleReport"),
    description: t("sampleReportDescription"),
    alternates: buildAlternates(locale, "/sample-report"),
  };
}

export default async function SampleReportPage({ params }: PageProps<"/[locale]/sample-report">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("marketing.sampleReport");
  const te = await getTranslations("enums");
  const dateFormat = new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    dateStyle: "long",
  });
  const issued = dateFormat.format(dateOnly(SAMPLE_CANDIDATE.issuedAt));

  return (
    <>
      <TrackView event="view_sample_report" />
      <Section tone="navy" className="py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">{t("title")}</h1>
          <p className="mt-6 text-lg text-white/80">{t("subtitle")}</p>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl">
          <Alert variant="warning">
            <AlertDescription>{t("illustrativeNotice")}</AlertDescription>
          </Alert>

          <article className="border-border mt-10 rounded-[16px] border bg-white p-8 sm:p-10">
            <header>
              <h2 className="text-xl">{t("candidateTitle")}</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Field label={t("referenceLabel")} value={SAMPLE_CANDIDATE.reference} />
                <Field
                  label={t("roleLabel")}
                  value={te(`role_family.${SAMPLE_CANDIDATE.roleFamily}` as "role_family.other")}
                />
                <Field
                  label={t("seniorityLabel")}
                  value={te(`seniority.${SAMPLE_CANDIDATE.seniority}` as "seniority.mid")}
                />
                <Field
                  label={t("experienceLabel")}
                  value={t("experienceValue", { years: SAMPLE_CANDIDATE.yearsExperience })}
                />
                <Field label={t("issuedLabel")} value={issued} />
              </dl>
            </header>

            <h2 className="mt-10 text-xl">{t("checksTitle")}</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-border border-b">
                  <th scope="col" className="py-2 font-medium">
                    {t("checkLabel")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("resultLabel")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("scoreLabel")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("decidedLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_CHECKS.map((check) => (
                  <tr key={check.id} className="border-border border-b last:border-0">
                    <th scope="row" className="py-3 font-medium">
                      {t(`checks.${check.id}` as "checks.identity")}
                    </th>
                    <td className="py-3">
                      {check.result === "verified" || check.result === "strong" ? (
                        <Badge variant="success">
                          {t(`results.${check.result}` as "results.verified")}
                        </Badge>
                      ) : (
                        <Badge variant="accent">
                          {te(`cefr_level.${check.result}` as "cefr_level.B2")}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 tabular-nums">
                      {check.score === undefined ? "—" : `${check.score} / ${check.outOf}`}
                    </td>
                    <td className="text-muted-foreground py-3">
                      {t(`decidedBy.${check.decidedBy}` as "decidedBy.reviewer")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="mt-10 text-xl">{t("rubricTitle")}</h2>
            <dl className="mt-4 space-y-3">
              {SAMPLE_ORAL_RUBRIC.map((row) => (
                <div key={row.id} className="flex items-center gap-4">
                  <dt className="w-48 shrink-0 text-sm">
                    {t(`rubric.${row.id}` as "rubric.fluency")}
                  </dt>
                  <dd className="flex flex-1 items-center gap-3">
                    <span className="bg-mist h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-green block h-full rounded-full"
                        style={{ width: `${(row.score / 5) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-24 shrink-0 text-xs tabular-nums">
                      {row.score} {t("rubricScale")}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-10 text-xl">{t("decisionTitle")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="bg-mist rounded-[12px] p-4">
                <p className="text-muted-foreground text-xs">{t("decisionAi")}</p>
                <p className="mt-1 font-semibold">
                  {te(`cefr_level.${SAMPLE_ORAL_DECISION.aiLevel}` as "cefr_level.B2")}
                </p>
              </div>
              <div className="bg-mint rounded-[12px] p-4">
                <p className="text-navy/70 text-xs">{t("decisionReviewer")}</p>
                <p className="text-navy mt-1 font-semibold">
                  {te(`cefr_level.${SAMPLE_ORAL_DECISION.reviewerLevel}` as "cefr_level.B2")}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              {t(
                `reviewerNotes.${SAMPLE_ORAL_DECISION.reviewerNoteId}` as "reviewerNotes.confirmed",
              )}
            </p>

            <h2 className="mt-10 text-xl">{t("workstyleTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("workstyleBody")}</p>
            <dl className="mt-4 space-y-3">
              {SAMPLE_WORKSTYLE.map((row) => (
                <div key={row.factor} className="flex items-center gap-4">
                  <dt className="w-48 shrink-0 text-sm">
                    {te(`workstyle_factor.${row.factor}` as "workstyle_factor.extraversion")}
                  </dt>
                  <dd className="flex flex-1 items-center gap-3">
                    <span className="bg-mist h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-navy block h-full rounded-full"
                        style={{ width: `${row.scaled}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-24 shrink-0 text-xs tabular-nums">
                      {row.scaled} {t("workstyleScale")}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-10 text-xl">{t("contactTitle")}</h2>
            <p className="mt-2 text-sm">{t("contactBody")}</p>

            <h2 className="mt-10 text-xl">{t("excludedTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("excludedBody")}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SAMPLE_EXCLUDED_FIELDS.map((field) => (
                <li key={field}>
                  <Badge variant="outline">{t(`excluded.${field}` as "excluded.photo")}</Badge>
                </li>
              ))}
            </ul>
          </article>
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
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">{t("ctaPricing")}</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
