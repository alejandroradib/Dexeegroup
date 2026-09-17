import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { CommercialsForm, JobReviewActions } from "@/components/domain/admin/job-review-actions";
import { JobDetail } from "@/components/domain/jobs/job-detail";
import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getAdminJobDetail } from "@/server/services/admin";
import type { PublicJob } from "@/server/services/public-jobs";

export default async function AdminJobDetailPage({
  params,
}: PageProps<"/[locale]/admin/jobs/[id]">) {
  await pageLocale(params);
  const { id } = await params;
  const [detail, t, tn, tc, format] = await Promise.all([
    getAdminJobDetail(id),
    getTranslations("admin.jobs.detail"),
    getTranslations("nav.admin"),
    getTranslations("common"),
    getFormatter(),
  ]);
  if (!detail) notFound();
  const { job, commercials, applications } = detail;
  const preview: PublicJob = {
    ...job,
    company_name: job.confidential_company ? "Confidential" : (job.companies?.name ?? ""),
    company_logo_path: job.confidential_company ? null : (job.companies?.logo_path ?? null),
    company_sector: job.companies?.sector ?? null,
    company_size: job.companies?.size ?? null,
    salary_min_usd: job.show_salary ? job.salary_min_usd : null,
    salary_max_usd: job.show_salary ? job.salary_max_usd : null,
  };
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0">
        <Link href="/admin/jobs">
          <ArrowLeftIcon /> {tn("jobs")}
        </Link>
      </Button>
      <PageHeader
        title={job.title}
        eyebrow={job.companies?.name}
        actions={
          <>
            <StatusChip kind="job" status={job.status} />
            <JobReviewActions job={job} />
          </>
        }
      />
      {job.companies?.status !== "verified" ? (
        <Alert variant="warning" className="mb-6">
          {t("companyPending")}
        </Alert>
      ) : null}
      {job.review_message ? (
        <Alert className="mb-6">
          <span className="font-semibold">{t("requestChanges")}:</span> {job.review_message}
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="border-border rounded-[12px] border bg-white p-6">
          <h2 className="mb-4 text-base">{t("preview")}</h2>
          <JobDetail
            job={preview}
            applyAction={
              <Button variant="accent" className="w-full" disabled>
                {tc("actions.apply")}
              </Button>
            }
          />
        </section>
        <aside className="grid gap-6 lg:self-start">
          <section className="border-navy/30 bg-mist/60 rounded-[12px] border p-5">
            <h2 className="text-base">{t("commercials")}</h2>
            <div className="mt-3">
              <CommercialsForm jobId={job.id} commercials={commercials} />
            </div>
          </section>
          <section className="border-border rounded-[12px] border bg-white p-5">
            <h2 className="text-base">
              {t("applicants")} ({applications.length})
            </h2>
            <ul className="divide-border mt-3 divide-y text-sm">
              {applications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <Link
                    href={`/admin/candidates/${a.candidate_id}`}
                    className="text-navy hover:underline"
                  >
                    {a.candidates?.first_name} {a.candidates?.last_name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {format.dateTime(new Date(a.created_at), "short")}
                    </span>
                    <StatusChip kind="application" status={a.status} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
