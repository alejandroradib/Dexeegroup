"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { applyToJob, withdrawApplication } from "@/server/actions/candidate";

type Existing = { id: string; status: string; created_at: string } | null;

export function ApplyButton({ jobId, jobTitle, existing, profileComplete }: { jobId: string; jobTitle: string; existing: Existing; profileComplete: boolean }) {
  const t = useTranslations("candidate.jobs");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (existing) {
    const canWithdraw = ["applied", "screening", "shortlisted", "interview"].includes(existing.status);
    return (
      <div className="grid gap-2">
        <p className="text-sm font-medium text-success">{t("applied", { date: format.dateTime(new Date(existing.created_at), "short") })}</p>
        <Button asChild variant="outline" className="w-full"><Link href="/candidate/applications">{tc("actions.view")}</Link></Button>
        {canWithdraw ? (
          <ConfirmButton variant="ghost" className="w-full text-danger" title={t("withdraw")} description={t("withdrawConfirm")} onConfirm={async () => {
            const result = await withdrawApplication(existing.id);
            toast({ title: result.ok ? t("withdrawn") : result.error === "withdrawNotAllowed" ? t("withdrawNotAllowed") : tc("errors.generic"), variant: result.ok ? "success" : "danger" });
            router.refresh();
          }}>
            {t("withdraw")}
          </ConfirmButton>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {!profileComplete ? <Alert variant="warning" className="mb-3 text-xs">{t("completeProfileFirst")}</Alert> : null}
      <Button variant="accent" size="lg" className="w-full" onClick={() => setOpen(true)}>{t("apply")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <DialogHeader>
            <DialogTitle>{t("applyTitle", { job: jobTitle })}</DialogTitle>
            <DialogDescription>{t("applyBody")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="cover_note">{t("coverNote")}</Label>
            <Textarea id="cover_note" rows={4} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby="cover_note_hint" />
            <p id="cover_note_hint" className="text-xs text-muted-foreground">{t("coverNoteHint")} ({note.length}/600)</p>
          </div>
          {error ? <Alert variant="danger">{error === "duplicate" ? t("duplicate") : error === "forbidden" ? t("forbidden") : tc("errors.generic")}</Alert> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{tc("actions.cancel")}</Button>
            <Button variant="accent" disabled={pending} onClick={() => start(async () => {
              setError(null);
              const result = await applyToJob({ job_id: jobId, cover_note: note || undefined });
              if (result.ok) { toast({ title: t("success"), variant: "success" }); setOpen(false); router.refresh(); }
              else setError(result.error);
            })}>
              {t("confirmApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
