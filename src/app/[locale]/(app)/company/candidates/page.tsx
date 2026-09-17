import { UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ApplicantsTable } from "@/components/domain/company/applicants-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { PAGE_SIZE, pageRange, parsePage, totalPages } from "@/lib/pagination";
import { APPLICATION_STATUSES } from "@/lib/validation/enums";
import { getCurrentCompany } from "@/server/services/companies";
import { listCompanyApplicants, listCompanyJobs, type ApplicationStatus } from "@/server/services/jobs";

export default async function CompanyCandidatesPage({ params, searchParams }: PageProps<"/[locale]/company/candidates">) {
  const locale = await pageLocale(params);
  const query = await searchParams;
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const t = await getTranslations("company.candidates");
  const te = await getTranslations("enums.application_status");
  const tf = await getTranslations("marketing.jobs.filters");
  const page = parsePage(query.page);
  const status = typeof query.status === "string" && APPLICATION_STATUSES.includes(query.status as ApplicationStatus) ? (query.status as ApplicationStatus) : undefined;
  const jobId = typeof query.job === "string" ? query.job : undefined;
  const q = typeof query.q === "string" ? query.q : undefined;
  const [{ rows, total }, jobs] = await Promise.all([listCompanyApplicants(company!.id, { status, jobId, q }, pageRange(page)), listCompanyJobs(company!.id)]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (jobId) params.set("job", jobId);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    return `/company/candidates${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <form method="get" className="mb-4 grid gap-3 rounded-[12px] border border-border bg-white p-4 sm:grid-cols-[1fr_200px_200px_auto]">
        <input name="q" defaultValue={q ?? ""} placeholder={t("filters.search")} aria-label={t("filters.search")} className="h-10 rounded-[10px] border border-input px-3 text-sm" />
        <select name="job" defaultValue={jobId ?? ""} aria-label={t("filters.job")} className="h-10 rounded-[10px] border border-input px-3 text-sm">
          <option value="">{tf("any")}</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ""} aria-label={t("filters.status")} className="h-10 rounded-[10px] border border-input px-3 text-sm">
          <option value="">{tf("any")}</option>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{te(s)}</option>)}
        </select>
        <button type="submit" className="h-10 rounded-[10px] bg-navy px-4 text-sm font-medium text-white">{tf("apply")}</button>
      </form>
      <ApplicantsTable rows={rows} emptyState={<EmptyState icon={UsersIcon} title={t("empty")} description={t("emptyBody")} />} />
      <Pagination page={page} total={totalPages(total, PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
