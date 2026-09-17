import { BuildingIcon } from "lucide-react";
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
import { COMPANY_STATUSES } from "@/lib/validation/enums";
import { listCompanies } from "@/server/services/admin";
import type { Database } from "@/types/database";

export default async function AdminCompaniesPage({ params, searchParams }: PageProps<"/[locale]/admin/companies">) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, te, tf, format] = await Promise.all([getTranslations("admin.companies"), getTranslations("enums"), getTranslations("marketing.jobs.filters"), getFormatter()]);
  const page = parsePage(query.page);
  const q = typeof query.q === "string" ? query.q : undefined;
  const status = typeof query.status === "string" && (COMPANY_STATUSES as readonly string[]).includes(query.status) ? (query.status as Database["public"]["Enums"]["company_status"]) : undefined;
  const { rows, total } = await listCompanies({ q, status }, pageRange(page));
  const hrefFor = (p: number) => { const s = new URLSearchParams(); if (q) s.set("q", q); if (status) s.set("status", status); if (p > 1) s.set("page", String(p)); return `/admin/companies${s.size ? `?${s}` : ""}`; };
  return (
    <>
      <PageHeader title={t("title")} />
      <FilterBar>
        <FilterField label={t("search")}><input name="q" defaultValue={q ?? ""} className={filterInputClass} /></FilterField>
        <FilterField label={t("status")}>
          <select name="status" defaultValue={status ?? ""} className={filterInputClass}>
            <option value="">{tf("any")}</option>
            {COMPANY_STATUSES.map((s) => <option key={s} value={s}>{te(`company_status.${s}`)}</option>)}
          </select>
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? <EmptyState icon={BuildingIcon} title={t("empty")} /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.owner")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.jobs")}</TableHead>
              <TableHead>{t("columns.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Link href={`/admin/companies/${c.id}`} className="font-medium text-navy hover:underline">{c.name}</Link><p className="text-xs text-muted-foreground">{c.sector ? te(`sector.${c.sector}`) : ""}</p></TableCell>
                <TableCell><p>{c.owner?.full_name}</p><p className="text-xs text-muted-foreground">{c.owner?.email}</p></TableCell>
                <TableCell><StatusChip kind="company" status={c.status} /></TableCell>
                <TableCell>{c.jobs_count}</TableCell>
                <TableCell>{format.dateTime(new Date(c.created_at), "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} total={totalPages(total, PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
