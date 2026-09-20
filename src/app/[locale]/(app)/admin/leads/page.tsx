import { InboxIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { LeadActions } from "@/components/domain/admin/lead-actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterField, filterInputClass } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageLocale } from "@/i18n/server";
import { isOverdue, waitingBusinessHours } from "@/lib/leads/response-time";
import { PAGE_SIZE, pageRange, parsePage, totalPages } from "@/lib/pagination";
import { BUDGET_BANDS, NEEDED_BY } from "@/lib/validation/lead";
import { countLeadsByStatus, listLeads, type LeadStatus } from "@/server/services/leads";

const STATUSES: LeadStatus[] = ["new", "answered", "converted", "discarded"];
const SENIORITIES = ["junior", "mid", "senior", "lead"] as const;

function one(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

/** Median so one lead answered a week late does not hide a queue that is otherwise fast. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : sorted[middle];
  return Math.round((value ?? 0) * 10) / 10;
}

export default async function AdminLeadsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/leads">) {
  await pageLocale(params);
  const query = await searchParams;
  const page = parsePage(query.page);
  const statusParam = one(query.status);
  const status = STATUSES.includes(statusParam as LeadStatus)
    ? (statusParam as LeadStatus)
    : undefined;
  const seniorityParam = one(query.seniority);
  const seniority = SENIORITIES.includes(seniorityParam as (typeof SENIORITIES)[number])
    ? (seniorityParam as (typeof SENIORITIES)[number])
    : undefined;
  const search = one(query.q);

  const [t, te, tl, format, list, counts] = await Promise.all([
    getTranslations("admin.leads"),
    getTranslations("enums"),
    getTranslations("marketing.lead"),
    getFormatter(),
    listLeads({ status, seniority, q: search }, pageRange(page)),
    countLeadsByStatus(),
  ]);

  const now = new Date();
  const rows = list.rows.map((lead) => {
    const created = new Date(lead.created_at);
    const answered = lead.answered_at ? new Date(lead.answered_at) : null;
    return {
      lead,
      created,
      answered,
      hours: waitingBusinessHours(created, answered, now),
      overdue: lead.status === "new" && isOverdue(created, now),
    };
  });
  const overdueOnPage = rows.filter((row) => row.overdue).length;
  const medianResponse = median(rows.filter((row) => row.answered).map((row) => row.hours));

  const hrefFor = (next: number) => {
    const search = new URLSearchParams();
    if (status) search.set("status", status);
    if (seniority) search.set("seniority", seniority);
    if (query.q) search.set("q", String(query.q));
    search.set("page", String(next));
    return `/admin/leads?${search.toString()}`;
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("stats.new")} value={String(counts.new)} />
        <StatCard
          label={t("stats.overdue")}
          value={String(overdueOnPage)}
          hint={overdueOnPage > 0 ? t("overdueCount", { count: overdueOnPage }) : undefined}
        />
        <StatCard
          label={t("stats.medianResponse")}
          value={
            medianResponse === null ? "—" : t("stats.medianResponseUnit", { hours: medianResponse })
          }
          hint={medianResponse === null ? t("noMedian") : undefined}
        />
      </div>

      <FilterBar>
        <FilterField label={t("filterStatus")}>
          <select name="status" defaultValue={status ?? ""} className={filterInputClass}>
            <option value="">{t("allStatuses")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}` as "status.new")}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("filterSeniority")}>
          <select name="seniority" defaultValue={seniority ?? ""} className={filterInputClass}>
            <option value="">{t("allStatuses")}</option>
            {SENIORITIES.map((value) => (
              <option key={value} value={value}>
                {te(`seniority.${value}`)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("search")}>
          <input name="q" defaultValue={search ?? ""} className={filterInputClass} />
        </FilterField>
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState icon={InboxIcon} title={t("empty")} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.received")}</TableHead>
                <TableHead>{t("columns.contact")}</TableHead>
                <TableHead>{t("columns.role")}</TableHead>
                <TableHead>{t("columns.budget")}</TableHead>
                <TableHead>{t("columns.needed")}</TableHead>
                <TableHead>{t("columns.waiting")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ lead, created, answered, hours, overdue }) => (
                <TableRow key={lead.id}>
                  <TableCell className="whitespace-nowrap">
                    {format.dateTime(created, { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell>
                    <p className="text-navy font-medium">{lead.name}</p>
                    <p className="text-muted-foreground text-xs">{lead.company}</p>
                    <a className="text-link text-xs underline" href={`mailto:${lead.email}`}>
                      {lead.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <p>{lead.role_to_fill}</p>
                    {lead.seniority ? (
                      <p className="text-muted-foreground text-xs">
                        {te(`seniority.${lead.seniority}`)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.budget_band && BUDGET_BANDS.includes(lead.budget_band as "not_sure")
                      ? tl(`budget.${lead.budget_band}` as "budget.not_sure")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.needed_by && NEEDED_BY.includes(lead.needed_by as "exploring")
                      ? tl(`timing.${lead.needed_by}` as "timing.exploring")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {answered ? t("answeredIn", { hours }) : t("waitingHours", { hours })}
                    {overdue ? (
                      <Badge variant="danger" className="ml-2">
                        {t("overdue")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.status === "converted" ? "success" : "outline"}>
                      {t(`status.${lead.status}` as "status.new")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <LeadActions leadId={lead.id} status={lead.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} total={totalPages(list.total, PAGE_SIZE)} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}
