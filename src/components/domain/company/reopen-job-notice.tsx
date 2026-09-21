"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { changeJobStatus } from "@/server/actions/company";
import type { Database } from "@/types/database";

type JobStatus = Database["public"]["Enums"]["job_status"];

/**
 * Shown in place of the wizard when a job's content is locked (audit A3). A company edits a
 * live job by withdrawing it to draft first; applicants in the running are told if the terms
 * change when it is resubmitted (audit D4). Closed jobs are duplicated instead.
 */
export function ReopenJobNotice({
  jobId,
  status,
  activeApplicants,
}: {
  jobId: string;
  status: JobStatus;
  activeApplicants: number;
}) {
  const t = useTranslations("company.wizard.locked");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const router = useRouter();
  const canReopen = status === "published" || status === "paused" || status === "pending_review";

  return (
    <div className="grid max-w-2xl gap-4">
      <Alert variant="warning">
        <p className="font-semibold">{t("title")}</p>
        <p className="mt-1 text-sm">{canReopen ? t("body") : t("closedBody")}</p>
      </Alert>
      {canReopen ? (
        <div>
          <ConfirmButton
            variant="accent"
            title={t("confirmTitle")}
            description={t("confirmBody", { count: activeApplicants })}
            confirmLabel={t("action")}
            onConfirm={async () => {
              const result = await changeJobStatus(jobId, "reopen");
              if (result.ok) {
                toast({ title: t("reopened"), variant: "success" });
                router.refresh();
              } else {
                toast({ title: tc("errors.generic"), variant: "danger" });
              }
            }}
          >
            {t("action")}
          </ConfirmButton>
        </div>
      ) : null}
    </div>
  );
}
