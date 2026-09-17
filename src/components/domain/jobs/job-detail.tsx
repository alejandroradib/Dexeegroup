import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { PublicJob } from "@/server/services/public-jobs";

import { salaryLabel } from "./job-card";

import type { ReactNode } from "react";

function Paragraphs({ text }: { text: string | null }) {
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.filter((l) => l.startsWith("- "));
  if (bullets.length === lines.length) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {lines.map((l, i) => (
          <li key={i}>{l.slice(2)}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-3">
      {lines.map((l, i) =>
        l.startsWith("- ") ? (
          <li key={i} className="ml-5 list-disc">
            {l.slice(2)}
          </li>
        ) : (
          <p key={i}>{l}</p>
        ),
      )}
    </div>
  );
}

export function JobDetail({ job, applyAction }: { job: PublicJob; applyAction: ReactNode }) {
  const t = useTranslations("marketing.jobs");
  const tl = useTranslations("common.labels");
  const te = useTranslations("enums");
  const format = useFormatter();

  const details: { label: string; value: string | null }[] = [
    {
      label: t("contract"),
      value: job.contract_type ? te(`contract_type.${job.contract_type}`) : null,
    },
    {
      label: t("employment"),
      value: job.employment_type ? te(`employment_type.${job.employment_type}`) : null,
    },
    { label: t("workMode"), value: job.work_mode ? te(`work_mode.${job.work_mode}`) : null },
    {
      label: t("overlap"),
      value: job.timezone_overlap ? te(`timezone_overlap.${job.timezone_overlap as "none"}`) : null,
    },
    {
      label: t("hoursPerWeek", { hours: job.hours_per_week ?? 0 }),
      value: job.hours_per_week ? "" : null,
    },
    {
      label: t("startDate"),
      value: job.start_date ? format.dateTime(new Date(job.start_date), "short") : null,
    },
    { label: t("salary"), value: salaryLabel(job, tl, format) },
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <article className="space-y-8">
        <header>
          <p className="text-deep-green text-sm font-semibold">
            {job.confidential_company ? tl("confidential") : job.company_name}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{job.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.role_family ? (
              <Badge variant="secondary">{te(`role_family.${job.role_family}`)}</Badge>
            ) : null}
            {job.seniority ? (
              <Badge variant="secondary">{te(`seniority.${job.seniority}`)}</Badge>
            ) : null}
            {job.english_level_required ? (
              <Badge variant="info">
                {t("englishRequired", { level: job.english_level_required })}
              </Badge>
            ) : null}
          </div>
          {job.confidential_company ? (
            <p className="text-muted-foreground mt-4 text-sm">{t("confidentialNote")}</p>
          ) : null}
        </header>
        {job.description ? (
          <section>
            <h2 className="text-xl">{t("aboutRole")}</h2>
            <div className="mt-3 text-base">
              <Paragraphs text={job.description} />
            </div>
          </section>
        ) : null}
        {job.responsibilities ? (
          <section>
            <h2 className="text-xl">{t("responsibilities")}</h2>
            <div className="mt-3">
              <Paragraphs text={job.responsibilities} />
            </div>
          </section>
        ) : null}
        {job.requirements ? (
          <section>
            <h2 className="text-xl">{t("requirements")}</h2>
            <div className="mt-3">
              <Paragraphs text={job.requirements} />
            </div>
          </section>
        ) : null}
        {job.skills && job.skills.length > 0 ? (
          <section>
            <h2 className="text-xl">{t("skills")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <li key={s}>
                  <Badge variant="outline">{s}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {job.contract_type ? (
          <section className="bg-mist rounded-[12px] p-5">
            <h2 className="text-base">{t("contractExplainer")}</h2>
            <p className="mt-2 text-sm">{te(`contract_type_description.${job.contract_type}`)}</p>
          </section>
        ) : null}
      </article>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="border-border rounded-[12px] border bg-white p-5">
          <p className="font-heading text-navy text-2xl font-bold">
            {salaryLabel(job, tl, format)}
          </p>
          <div className="mt-4">{applyAction}</div>
          {job.closes_at ? (
            <p className="text-muted-foreground mt-3 text-xs">
              {t("closesOn", { date: format.dateTime(new Date(job.closes_at), "short") })}
            </p>
          ) : null}
        </div>
        <dl className="border-border rounded-[12px] border bg-white p-5 text-sm">
          <h2 className="mb-3 text-base">{t("details")}</h2>
          {details
            .filter((d) => d.value !== null)
            .map((d) => (
              <div
                key={d.label}
                className="border-border flex justify-between gap-4 border-b py-2 last:border-0"
              >
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="text-navy text-right font-medium">{d.value}</dd>
              </div>
            ))}
        </dl>
      </aside>
    </div>
  );
}
