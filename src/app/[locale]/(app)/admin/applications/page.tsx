import { FileTextIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ReleaseContactButton, StatusSelect } from "@/components/domain/admin/application-admin-actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterField, filterInputClass } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { PAGE_SIZE, pageRange, parsePage, totalPages } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUSES } from "@/lib/validation/enums";
import { listAdminApplications } from "@/server/services/admin";
import type { Database } from "@/types/database";

export default async function AdminApplicationsPage({ params, searchParams }: PageProps<"/[locale]/admin/applications">) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, te, tf, tc, format] = await Promise.all([getTranslations("admin.applications"), getTranslations("enums"), getTranslations("marketing.jobs.filters"), getTranslations("common"), getFormatter()]);
  const page = parsePage(query.page);
  const status = typeof query.status === "string" && (APPLICATION_STATUSES as readonly string[]).includes(query.status) ? (query.status as Database["public"]["Enums"]["application_status"]) : undefined;
  const contact = query.contact === "requested" || query.contact === "released" ? query.contact : undefined;
  const q = typeof query.q === "string" ? query.q : undefined;
  const highlight = typeof query.application === "string" ? query.application : undefined;
  const { rows, total } = await listAdminApplications({ status, contact, q }, pageRange(page));
  const hrefFor = (p: number) => { const s = new URLSearchParams(); if (status) s.set("status", status); if (contact) s.set("contact", contact); if (q) s.set("q", q); if (p > 1) s.set("page", String(p)); return `/admin/applications${s.size ? `?${s}` : ""}`; };
  return (
    <>
      <PageHeader title={t("title")} />
      <FilterBar>
        <FilterField label={t("search")}><input name="q" defaultValue={q ?? ""} className={filterInputClass} /></FilterField>
        <FilterField label={t("status")}><select name="status" defaultValue={status ?? ""} className={filterInputClass}><option value="">{tf("any")}</option>{APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{te(`application_status.${s}`)}</option>)}</select></FilterField>
        <FilterField label={t("contact")}><select name="contact" defaultValue={contact ?? ""} className={filterInputClass}><option value="">{t("contactAny")}</option><option value="requested">{t("contactRequested")}</option><option value="released">{t("contactReleased")}</option></select></FilterField>
      </FilterBar>
      {rows.length === 0 ? <EmptyState icon={FileTextIcon} title={t("empty")} /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.candidate")}</TableHead>
              <TableHead>{t("columns.job")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.contact")}</TableHead>
              <TableHead>{t("columns.applied")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} className={cn(highlight === a.id && "bg-mint/40")}>
                <TableCell>
                  <Link href={`/admin/candidates/${a.candidate_id}`} className="font-medium text-navy hover:underline">{a.candidates?.first_name} {a.candidates?.last_name}</Link>
                  <div className="mt-0.5 flex gap-1">{a.source === "dexee_recommended" ? <Badge variant="accent">{tc("labels.dexeeRecommended")}</Badge> : null}{a.candidates?.english_verified_level ? <Badge variant="success">{a.candidates.english_verified_level}</Badge> : null}</div>
                </TableCell>
                <TableCell><Link href={`/admin/jobs/${a.job_id}`} className="hover:underline">{a.jobs?.title}</Link><p className="text-xs text-muted-foreground">{a.jobs?.companies?.name}</p></TableCell>
                <TableCell><StatusSelect applicationId={a.id} status={a.status} /></TableCell>
                <TableCell>
                  {a.contact_released ? <p className="text-xs text-success">{t("releasedOn", { date: format.dateTime(new Date(a.contact_released_at ?? a.updated_at), "short") })}</p> : (
                    <div className="grid gap-1">
                      <p className="text-xs text-muted-foreground">{a.contact_requested_at ? t("requestedOn", { date: format.dateTime(new Date(a.contact_requested_at), "short") }) : t("notRequested")}</p>
                      {a.status !== "withdrawn" && a.status !== "rejected" ? <ReleaseContactButton applicationId={a.id} company={a.jobs?.companies?.name ?? ""} /> : null}
                    </div>
                  )}
                </TableCell>
                <TableCell>{format.dateTime(new Date(a.created_at), "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} total={totalPages(total, PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
