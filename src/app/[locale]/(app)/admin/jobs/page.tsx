import { BriefcaseIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterField, filterInputClass } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { StatusChip } from "@/components/shared/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { PAGE_SIZE, pageRange, parsePage, totalPages } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { JOB_STATUSES } from "@/lib/validation/enums";
import { listAdminJobs } from "@/server/services/admin";
import type { Database } from "@/types/database";

export default async function AdminJobsPage({ params, searchParams }: PageProps<"/[locale]/admin/jobs">) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, te, tf, format] = await Promise.all([getTranslations("admin.jobs"), getTranslations("enums"), getTranslations("marketing.jobs.filters"), getFormatter()]);
  const tab = query.tab === "all" ? "all" : "queue";
  const page = parsePage(query.page);
  const q = typeof query.q === "string" ? query.q : undefined;
  const status = typeof query.status === "string" && (JOB_STATUSES as readonly string[]).includes(query.status) ? (query.status as Database["public"]["Enums"]["job_status"]) : undefined;
  const { rows, total } = await listAdminJobs({ queue: tab === "queue", status, q }, pageRange(page));
  const hrefFor = (p: number) => { const s = new URLSearchParams(); s.set("tab", tab); if (q) s.set("q", q); if (status) s.set("status", status); if (p > 1) s.set("page", String(p)); return `/admin/jobs?${s}`; };
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mb-4 inline-flex rounded-[10px] bg-mist p-1">
        {(["queue", "all"] as const).map((k) => (
          <Link key={k} href={`/admin/jobs?tab=${k}`} className={cn("rounded-[8px] px-3 py-1.5 text-sm font-medium", tab === k ? "bg-white text-navy shadow-sm" : "text-muted-foreground")}>{t(`tabs.${k}`)}</Link>
        ))}
      </div>
      <FilterBar>
        <input type="hidden" name="tab" value={tab} />
        <FilterField label={t("search")}><input name="q" defaultValue={q ?? ""} className={filterInputClass} /></FilterField>
        {tab === "all" ? (
          <FilterField label={t("columns.status")}>
            <select name="status" defaultValue={status ?? ""} className={filterInputClass}>
              <option value="">{tf("any")}</option>
              {JOB_STATUSES.map((s) => <option key={s} value={s}>{te(`job_status.${s}`)}</option>)}
            </select>
          </FilterField>
        ) : null}
      </FilterBar>
      {rows.length === 0 ? <EmptyState icon={BriefcaseIcon} title={t("empty")} description={tab === "queue" ? t("emptyBody") : undefined} /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.title")}</TableHead>
              <TableHead>{t("columns.company")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.applicants")}</TableHead>
              <TableHead>{t("columns.updated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((job) => (
              <TableRow key={job.id}>
                <TableCell><Link href={`/admin/jobs/${job.id}`} className="font-medium text-navy hover:underline">{job.title}</Link></TableCell>
                <TableCell><Link href={`/admin/companies/${job.companies?.id}`} className="hover:underline">{job.companies?.name}</Link>{job.companies?.status !== "verified" ? <p className="text-xs text-warning">{te(`company_status.${job.companies?.status ?? "pending"}`)}</p> : null}</TableCell>
                <TableCell><StatusChip kind="job" status={job.status} /></TableCell>
                <TableCell>{job.applications_count}</TableCell>
                <TableCell>{format.dateTime(new Date(job.updated_at), "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} total={totalPages(total, PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
