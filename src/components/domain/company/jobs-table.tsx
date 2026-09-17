"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { DataTable } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { changeJobStatus, deleteDraftJob, duplicateJob } from "@/server/actions/company";
import type { JobWithCounts } from "@/server/services/jobs";

import type { ColumnDef } from "@tanstack/react-table";

export function JobsTable({
  jobs,
  emptyState,
}: {
  jobs: JobWithCounts[];
  emptyState: React.ReactNode;
}) {
  const t = useTranslations("company.jobs");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [, start] = useTransition();

  function run(action: () => Promise<{ ok: boolean }>, success: string) {
    start(async () => {
      const result = await action();
      toast({
        title: result.ok ? success : tc("errors.generic"),
        variant: result.ok ? "success" : "danger",
      });
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<JobWithCounts, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("columns.title"),
        cell: ({ row }) => (
          <div>
            <Link
              href={
                row.original.status === "draft" || row.original.status === "changes_requested"
                  ? `/company/jobs/${row.original.id}/edit`
                  : `/company/jobs/${row.original.id}/pipeline`
              }
              className="text-navy font-medium hover:underline"
            >
              {row.original.title}
            </Link>
            {row.original.review_message && row.original.status === "changes_requested" ? (
              <p className="text-warning mt-0.5 line-clamp-1 text-xs">
                {row.original.review_message}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => <StatusChip kind="job" status={row.original.status} />,
      },
      {
        accessorKey: "total",
        header: t("columns.applicants"),
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.total}</span>
            <p className="text-muted-foreground text-xs">
              {t("applicantsByStage", {
                applied: row.original.counts.applied,
                screening: row.original.counts.screening,
                shortlisted: row.original.counts.shortlisted,
                interview: row.original.counts.interview,
              })}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "published_at",
        header: t("columns.published"),
        cell: ({ row }) =>
          row.original.published_at
            ? format.dateTime(new Date(row.original.published_at), "short")
            : "—",
      },
      {
        accessorKey: "updated_at",
        header: t("columns.updated"),
        cell: ({ row }) => format.dateTime(new Date(row.original.updated_at), "short"),
      },
      {
        id: "actions",
        header: tc("labels.actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={tc("labels.actions")}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/company/jobs/${job.id}/edit`}>{t("actions.edit")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/company/jobs/${job.id}/pipeline`}>{t("actions.pipeline")}</Link>
                </DropdownMenuItem>
                {job.status === "published" && job.slug ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/jobs/${job.slug}`} target="_blank">
                      {t("actions.view")}
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                {job.status === "published" ? (
                  <DropdownMenuItem
                    onSelect={() => run(() => changeJobStatus(job.id, "pause"), t("statusChanged"))}
                  >
                    {t("actions.pause")}
                  </DropdownMenuItem>
                ) : null}
                {job.status === "paused" ? (
                  <DropdownMenuItem
                    onSelect={() =>
                      run(() => changeJobStatus(job.id, "resume"), t("statusChanged"))
                    }
                  >
                    {t("actions.resume")}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => run(() => duplicateJob(job.id), t("duplicated"))}>
                  {t("actions.duplicate")}
                </DropdownMenuItem>
                {job.status !== "closed" && job.status !== "draft" ? (
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 font-normal"
                      title={t("actions.close")}
                      description={t("closeConfirm")}
                      onConfirm={async () =>
                        run(() => changeJobStatus(job.id, "close"), t("statusChanged"))
                      }
                    >
                      {t("actions.close")}
                    </ConfirmButton>
                  </DropdownMenuItem>
                ) : null}
                {job.status === "draft" ? (
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      className="text-danger w-full justify-start px-2 font-normal"
                      title={t("actions.delete")}
                      description={t("deleteConfirm")}
                      onConfirm={async () => run(() => deleteDraftJob(job.id), t("statusChanged"))}
                    >
                      {t("actions.delete")}
                    </ConfirmButton>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, tc, format],
  );

  return <DataTable columns={columns} data={jobs} emptyState={emptyState} />;
}
