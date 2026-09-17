"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { CefrBadge } from "@/components/shared/cefr-badge";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/i18n/navigation";
import type { ApplicantRow } from "@/server/services/jobs";

import { ApplicantDrawer } from "./applicant-drawer";

import type { ColumnDef } from "@tanstack/react-table";

export function ApplicantsTable({ rows, emptyState }: { rows: ApplicantRow[]; emptyState: React.ReactNode }) {
  const t = useTranslations("company.candidates.columns");
  const tc = useTranslations("common.labels");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<ApplicantRow, unknown>[]>(
    () => [
      {
        id: "candidate",
        header: t("candidate"),
        accessorFn: (r) => r.candidate?.first_name ?? "",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-navy">{row.original.candidate ? `${row.original.candidate.first_name} ${row.original.candidate.last_initial ?? ""}.` : "—"}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.candidate?.headline}</p>
            {row.original.application.source === "dexee_recommended" ? <Badge variant="accent" className="mt-1">{tc("dexeeRecommended")}</Badge> : null}
          </div>
        ),
      },
      { id: "job", header: t("job"), accessorFn: (r) => r.job.title, cell: ({ row }) => row.original.job.title },
      { id: "status", header: t("status"), accessorFn: (r) => r.application.status, cell: ({ row }) => <StatusChip kind="application" status={row.original.application.status} /> },
      { id: "english", header: t("english"), enableSorting: false, cell: ({ row }) => <CefrBadge verified={row.original.candidate?.english_verified_level} written={row.original.candidate?.english_written_level} self={row.original.candidate?.english_self_level} /> },
      { id: "applied", header: t("applied"), accessorFn: (r) => r.application.created_at, cell: ({ row }) => format.dateTime(new Date(row.original.application.created_at), "short") },
    ],
    [t, tc, format],
  );

  return (
    <>
      <DataTable columns={columns} data={rows} emptyState={emptyState} onRowClick={(row) => setOpen(row.application.id)} />
      <ApplicantDrawer applicationId={open} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />
    </>
  );
}
