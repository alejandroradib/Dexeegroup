import { BriefcaseIcon, ClockIcon, GlobeIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { PublicJob } from "@/server/services/public-jobs";

export function salaryLabel(job: Pick<PublicJob, "salary_min_usd" | "salary_max_usd" | "show_salary">, t: ReturnType<typeof useTranslations<"common.labels">>, format: ReturnType<typeof useFormatter>) {
  if (!job.show_salary || (job.salary_min_usd === null && job.salary_max_usd === null)) return t("salaryHidden");
  const min = job.salary_min_usd ?? job.salary_max_usd ?? 0;
  const max = job.salary_max_usd ?? job.salary_min_usd ?? 0;
  if (min === max) return t("usdPerMonth", { amount: format.number(min) });
  return t("usdRange", { min: format.number(min), max: format.number(max) });
}

export function JobCard({ job, hrefBase = "/jobs" }: { job: PublicJob; hrefBase?: string }) {
  const t = useTranslations("marketing.jobs");
  const tl = useTranslations("common.labels");
  const te = useTranslations("enums");
  const format = useFormatter();
  const href = `${hrefBase}/${job.slug}`;

  return (
    <article className="flex flex-col gap-3 rounded-[12px] border border-border bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg leading-snug">
            <Link href={href} className="hover:underline">{job.title}</Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.confidential_company ? tl("confidential") : job.company_name}
          </p>
        </div>
        {job.seniority ? <Badge variant="secondary">{te(`seniority.${job.seniority}`)}</Badge> : null}
      </div>
      <p className="font-heading text-base font-bold text-navy">{salaryLabel(job, tl, format)}</p>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {job.contract_type ? (
          <div className="flex items-center gap-1.5"><BriefcaseIcon className="size-4" aria-hidden /><dd>{te(`contract_type.${job.contract_type}`)}</dd></div>
        ) : null}
        {job.employment_type ? (
          <div className="flex items-center gap-1.5"><ClockIcon className="size-4" aria-hidden /><dd>{te(`employment_type.${job.employment_type}`)}</dd></div>
        ) : null}
        {job.english_level_required ? (
          <div className="flex items-center gap-1.5"><GlobeIcon className="size-4" aria-hidden /><dd>{t("englishRequired", { level: job.english_level_required })}</dd></div>
        ) : null}
      </dl>
      {job.skills && job.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("skills")}>
          {job.skills.slice(0, 5).map((skill) => (
            <li key={skill}><Badge variant="outline">{skill}</Badge></li>
          ))}
        </ul>
      ) : null}
      {job.published_at ? (
        <p className="text-xs text-muted-foreground">{t("publishedOn", { date: format.dateTime(new Date(job.published_at), "short") })}</p>
      ) : null}
    </article>
  );
}
