"use client";

import { useFormatter, useTranslations } from "next-intl";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { StatusChip } from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { withdrawApplication } from "@/server/actions/candidate";
import type { CandidateApplication } from "@/server/services/candidates";

export function ApplicationsList({ applications }: { applications: CandidateApplication[] }) {
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
        return (
          <li key={a.id} className="rounded-[12px] border border-border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base">
                  {a.job?.slug ? <Link href={`/candidate/jobs/${a.job.slug}`} className="hover:underline">{a.job.title}</Link> : a.job?.title ?? "—"}
                </h3>
                <p className="text-sm text-muted-foreground">{a.job?.confidential_company ? tc("labels.confidential") : a.job?.company_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("appliedOn", { date: format.dateTime(new Date(a.created_at), "short") })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {a.source === "dexee_recommended" ? <Badge variant="accent">{t("recommendedBy")}</Badge> : null}
                <StatusChip kind="application" status={a.status} />
              </div>
            </div>
            <ol className="mt-4 flex flex-wrap gap-2" aria-label={t("timeline")}>
              {a.events.map((e) => (
                <li key={e.id} className="rounded-full bg-mist px-3 py-1 text-xs text-navy">
                  {te(`application_status.${e.to_status}`)} · {format.dateTime(new Date(e.created_at), "short")}
                </li>
              ))}
            </ol>
            {canWithdraw ? (
              <div className="mt-4">
                <ConfirmButton variant="ghost" size="sm" className="text-danger" title={tj("withdraw")} description={tj("withdrawConfirm")} onConfirm={async () => {
                  const result = await withdrawApplication(a.id);
                  toast({ title: result.ok ? tj("withdrawn") : tc("errors.generic"), variant: result.ok ? "success" : "danger" });
                  router.refresh();
                }}>
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
