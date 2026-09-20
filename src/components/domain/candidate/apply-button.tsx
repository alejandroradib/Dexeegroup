"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics/events";
import { applyToJob, withdrawApplication } from "@/server/actions/candidate";
import type { ApplyRequirement } from "@/server/services/candidates";

type Existing = { id: string; status: string; created_at: string } | null;

/** Where a candidate goes to clear each requirement. */
function requirementHref(requirement: ApplyRequirement["requirement"]): string {
  return requirement === "resume"
    ? "/candidate/onboarding"
    : `/candidate/assessments/${requirement}`;
}

export function ApplyButton({
  jobId,
  jobTitle,
  existing,
  profileComplete,
  requirements,
}: {
  jobId: string;
  jobTitle: string;
  existing: Existing;
  profileComplete: boolean;
  requirements: ApplyRequirement[];
}) {
  const t = useTranslations("candidate.jobs");
  const tc = useTranslations("common");
  const te = useTranslations("enums.assessment_type");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (existing) {
    const canWithdraw = ["applied", "screening", "shortlisted", "interview"].includes(
      existing.status,
    );
    return (
      <div className="grid gap-2">
        <p className="text-success text-sm font-medium">
          {t("applied", { date: format.dateTime(new Date(existing.created_at), "short") })}
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/candidate/applications">{tc("actions.view")}</Link>
        </Button>
        {canWithdraw ? (
          <ConfirmButton
            variant="ghost"
            className="text-danger w-full"
            title={t("withdraw")}
            description={t("withdrawConfirm")}
            onConfirm={async () => {
              const result = await withdrawApplication(existing.id);
              toast({
                title: result.ok
                  ? t("withdrawn")
                  : result.error === "withdrawNotAllowed"
                    ? t("withdrawNotAllowed")
                    : tc("errors.generic"),
                variant: result.ok ? "success" : "danger",
              });
              router.refresh();
            }}
          >
            {t("withdraw")}
          </ConfirmButton>
        ) : null}
      </div>
    );
  }

  const missing = requirements.filter((r) => !r.satisfied);
  const blocked = missing.length > 0;

  return (
    <>
      {!profileComplete ? (
        <Alert variant="warning" className="mb-3 text-xs">
          {t("completeProfileFirst")}
        </Alert>
      ) : null}
      <section
        className="border-border mb-3 rounded-[12px] border bg-white p-4"
        aria-labelledby="apply-requirements"
      >
        <h3 id="apply-requirements" className="text-navy text-sm font-semibold">
          {t("requirementsTitle")}
        </h3>
        <p className="text-muted-foreground mt-1 text-xs">{t("requirementsBody")}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {requirements.map((r) => {
            // validUntil is the latest result's window; unsatisfied with a window means it closed.
            const expired = !r.satisfied && r.validUntil !== null;
            return (
              <li key={r.requirement} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={
                      r.satisfied
                        ? "bg-success-soft text-success flex size-5 items-center justify-center rounded-full text-xs"
                        : "bg-mist text-muted-foreground flex size-5 items-center justify-center rounded-full text-xs"
                    }
                  >
                    {r.satisfied ? "✓" : "·"}
                  </span>
                  <span>
                    {r.requirement === "resume" ? t("requirementResume") : te(r.requirement)}
                  </span>
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {r.satisfied
                    ? r.validUntil
                      ? t("requirementValidUntil", {
                          date: format.dateTime(new Date(r.validUntil), "short"),
                        })
                      : t("requirementDone")
                    : expired
                      ? t("requirementExpired")
                      : t("requirementMissing")}
                  {!r.satisfied ? (
                    <Link href={requirementHref(r.requirement)} className="text-link underline">
                      {t("requirementGo")}
                    </Link>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        disabled={blocked}
        aria-disabled={blocked}
        onClick={() => setOpen(true)}
      >
        {t("apply")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <DialogHeader>
            <DialogTitle>{t("applyTitle", { job: jobTitle })}</DialogTitle>
            <DialogDescription>{t("applyBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="cover_note">{t("coverNote")}</Label>
            <Textarea
              id="cover_note"
              rows={4}
              maxLength={600}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby="cover_note_hint"
            />
            <p id="cover_note_hint" className="text-muted-foreground text-xs">
              {t("coverNoteHint")} ({note.length}/600)
            </p>
          </div>
          {error ? (
            <Alert variant="danger">
              {error === "duplicate"
                ? t("duplicate")
                : error === "forbidden"
                  ? t("forbidden")
                  : error.startsWith("requirementsMissing:")
                    ? t("requirementsMissingError", {
                        items: error
                          .slice("requirementsMissing:".length)
                          .split(",")
                          .filter(Boolean)
                          .map((item) =>
                            item === "resume" ? t("requirementResume") : te(item as "disc"),
                          )
                          .join(", "),
                      })
                    : tc("errors.generic")}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button
              variant="accent"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const result = await applyToJob({ job_id: jobId, cover_note: note || undefined });
                  if (result.ok) {
                    track("apply_job");
                    toast({ title: t("success"), variant: "success" });
                    setOpen(false);
                    router.refresh();
                  } else if (result.error === "requirementsMissing") {
                    setError(`requirementsMissing:${(result.details?.missing ?? []).join(",")}`);
                    router.refresh();
                  } else setError(result.error);
                })
              }
            >
              {t("confirmApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
