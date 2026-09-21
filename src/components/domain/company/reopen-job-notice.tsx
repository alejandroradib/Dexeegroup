"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changeJobStatus } from "@/server/actions/company";
import type { Database } from "@/types/database";

type JobStatus = Database["public"]["Enums"]["job_status"];

/**
 * Shown in place of the wizard when a job's content is locked (audit A3). A company edits a
 * live job by withdrawing it to draft first; closed jobs are duplicated instead.
 */
export function ReopenJobNotice({ jobId, status }: { jobId: string; status: JobStatus }) {
  const t = useTranslations("company.wizard.locked");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const canReopen = status === "published" || status === "paused" || status === "pending_review";

  return (
    <div className="grid max-w-2xl gap-4">
      <Alert variant="warning">
        <p className="font-semibold">{t("title")}</p>
        <p className="mt-1 text-sm">{canReopen ? t("body") : t("closedBody")}</p>
      </Alert>
      {canReopen ? (
        <div>
          <Button
            variant="accent"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await changeJobStatus(jobId, "reopen");
                if (result.ok) {
                  toast({ title: t("reopened"), variant: "success" });
                  router.refresh();
                } else {
                  toast({ title: tc("errors.generic"), variant: "danger" });
                }
              })
            }
          >
            {t("action")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
