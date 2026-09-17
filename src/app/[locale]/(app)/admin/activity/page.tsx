import { ActivityIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterField, filterInputClass } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pageLocale } from "@/i18n/server";
import { PAGE_SIZE, pageRange, parsePage, totalPages } from "@/lib/pagination";
import { listActivity } from "@/server/services/admin";

export default async function AdminActivityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/activity">) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, format] = await Promise.all([getTranslations("admin.activity"), getFormatter()]);
  const page = parsePage(query.page);
  const action = typeof query.action === "string" && query.action ? query.action : undefined;
  const entity = typeof query.entity === "string" && query.entity ? query.entity : undefined;
  const { rows, total } = await listActivity({ action, entity_type: entity }, pageRange(page));
  const hrefFor = (p: number) => {
    const s = new URLSearchParams();
    if (action) s.set("action", action);
    if (entity) s.set("entity", entity);
    if (p > 1) s.set("page", String(p));
    return `/admin/activity${s.size ? `?${s}` : ""}`;
  };
  return (
    <>
      <PageHeader title={t("title")} />
      <FilterBar>
        <FilterField label={t("action")}>
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="company."
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label={t("entity")}>
          <select name="entity" defaultValue={entity ?? ""} className={filterInputClass}>
            <option value="">—</option>
            {[
              "company",
              "job",
              "candidate",
              "application",
              "placement",
              "assessment",
              "assessment_attempt",
              "profile",
              "data_request",
            ].map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon={ActivityIcon} title={t("empty")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.when")}</TableHead>
              <TableHead>{t("columns.actor")}</TableHead>
              <TableHead>{t("columns.action")}</TableHead>
              <TableHead>{t("columns.entity")}</TableHead>
              <TableHead>{t("columns.details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">
                  {format.dateTime(new Date(r.created_at), {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </TableCell>
                <TableCell>{r.profiles?.full_name ?? r.profiles?.email}</TableCell>
                <TableCell className="text-navy font-medium">{r.action}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {r.entity_type}
                  {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[320px] truncate font-mono text-xs">
                  {JSON.stringify(r.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} total={totalPages(total, PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
