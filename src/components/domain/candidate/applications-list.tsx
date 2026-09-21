"use client";

import { useFormatter, useTranslations } from "next-intl";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { StatusChip } from "@/components/shared/status-chip";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { isOnDexeeHold } from "@/lib/candidates/dexee-hold";
import { withdrawApplication } from "@/server/actions/candidate";
import type { CandidateApplication } from "@/server/services/candidates";

export function ApplicationsList({
  applications,
  visibility,
}: {
  applications: CandidateApplication[];
  visibility: "visible_to_companies" | "dexee_only" | null;
}) {
  const t = useTranslations("candidate.applications");
  const tj = useTranslations("candidate.jobs");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <ul className="grid gap-4">
      {applications.map((a) => {
        const canWithdraw = ["applied", "screening", "shortlisted", "interview"].includes(a.status);
        const onHold = isOnDexeeHold({ visibility, status: a.status });
        return (
          <li key={a.id} className="border-border rounded-[12px] border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base">
                  {a.job?.slug && a.job.status === "published" ? (
                    <Link href={`/candidate/jobs/${a.job.slug}`} className="hover:underline">
                      {a.job.title}
                    </Link>
                  ) : (
                    (a.job?.title ?? t("jobUnavailable"))
                  )}
                </h3>
                {a.job && a.job.status !== "published" ? (
                  <p className="text-warning text-xs font-medium">
                    {a.job.status === "closed"
                      ? t("jobClosed")
                      : a.job.status === "paused"
                        ? t("jobPaused")
                        : t("jobUpdating")}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-sm">
                  {a.job?.confidential_company ? tc("labels.confidential") : a.job?.company_name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("appliedOn", { date: format.dateTime(new Date(a.created_at), "short") })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {a.source === "dexee_recommended" ? (
                  <Badge variant="accent">{t("recommendedBy")}</Badge>
                ) : null}
                <StatusChip kind="application" status={a.status} />
              </div>
            </div>
            {onHold ? (
              <Alert variant="warning" className="mt-4 text-xs">
                {t("dexeeOnlyHold")}{" "}
                <Link href="/candidate/settings" className="text-link underline">
                  {t("dexeeOnlyHoldLink")}
                </Link>
              </Alert>
            ) : null}
            <ol className="mt-4 flex flex-wrap gap-2" aria-label={t("timeline")}>
              {a.events.map((e) => (
                <li key={e.id} className="bg-mist text-navy rounded-full px-3 py-1 text-xs">
                  {te(`application_status.${e.to_status}`)} ·{" "}
                  {format.dateTime(new Date(e.created_at), "short")}
                </li>
              ))}
            </ol>
            {canWithdraw ? (
              <div className="mt-4">
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  title={tj("withdraw")}
                  description={tj("withdrawConfirm")}
                  onConfirm={async () => {
                    const result = await withdrawApplication(a.id);
                    toast({
                      title: result.ok ? tj("withdrawn") : tc("errors.generic"),
                      variant: result.ok ? "success" : "danger",
                    });
                    router.refresh();
                  }}
                >
                  {t("withdraw")}
                </ConfirmButton>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
