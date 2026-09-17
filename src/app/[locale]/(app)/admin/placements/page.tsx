import { HandshakeIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import {
  EndPlacementButton,
  RecordPlacementDialog,
} from "@/components/domain/admin/placement-forms";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { marginPercent, monthlyMargin, totalMonthlyMargin } from "@/lib/placements";
import { listHiredWithoutPlacement, listPlacements } from "@/server/services/admin";

export default async function AdminPlacementsPage({
  params,
}: PageProps<"/[locale]/admin/placements">) {
  await pageLocale(params);
  const [t, te, tc, format, placements, pending] = await Promise.all([
    getTranslations("admin.placements"),
    getTranslations("enums"),
    getTranslations("common"),
    getFormatter(),
    listPlacements(),
    listHiredWithoutPlacement(),
  ]);
  const total = totalMonthlyMargin(placements);
  const active = placements.filter((p) => p.status === "active").length;
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label={t("totalMargin")}
          value={tc("labels.usdPerMonth", { amount: format.number(total) })}
          hint={t("activeCount", { count: active })}
        />
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-muted-foreground text-sm">{t("pending")}</h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm">{t("pendingEmpty")}</p>
          ) : (
            <ul className="divide-border mt-2 divide-y text-sm">
              {pending.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-navy font-medium">
                      {h.candidates?.first_name} {h.candidates?.last_name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {h.jobs?.title} · {h.jobs?.companies?.name}
                    </p>
                  </div>
                  <RecordPlacementDialog
                    applicationId={h.id}
                    candidate={`${h.candidates?.first_name ?? ""} ${h.candidates?.last_name ?? ""}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {placements.length === 0 ? (
        <EmptyState icon={HandshakeIcon} title={t("empty")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.candidate")}</TableHead>
              <TableHead>{t("columns.company")}</TableHead>
              <TableHead>{t("columns.contract")}</TableHead>
              <TableHead>{t("columns.start")}</TableHead>
              <TableHead>{t("columns.salary")}</TableHead>
              <TableHead>{t("columns.billRate")}</TableHead>
              <TableHead>{t("columns.margin")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{tc("labels.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="text-navy font-medium">
                    {p.candidates?.first_name} {p.candidates?.last_name}
                  </p>
                  <p className="text-muted-foreground text-xs">{p.applications?.jobs?.title}</p>
                </TableCell>
                <TableCell>{p.companies?.name}</TableCell>
                <TableCell>{te(`contract_type.${p.contract_type}`)}</TableCell>
                <TableCell>
                  {format.dateTime(new Date(p.start_date), "short")}
                  {p.end_date ? ` – ${format.dateTime(new Date(p.end_date), "short")}` : ""}
                </TableCell>
                <TableCell>{format.number(p.monthly_salary_usd)}</TableCell>
                <TableCell>{format.number(p.monthly_bill_rate_usd)}</TableCell>
                <TableCell>
                  <span className="font-medium">{format.number(monthlyMargin(p))}</span>
                  {marginPercent(p) !== null ? (
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({marginPercent(p)}%)
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "success" : "secondary"}>
                    {te(`placement_status.${p.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.status === "active" ? <EndPlacementButton placementId={p.id} /> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
