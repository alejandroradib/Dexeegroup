"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { setCompanyStatus, verifyCompany } from "@/server/actions/admin";
import type { Database } from "@/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Job = Pick<Database["public"]["Tables"]["jobs"]["Row"], "id" | "title" | "status">;

export function CompanyActions({ company, pendingJobs }: { company: Company; pendingJobs: Job[] }) {
  const t = useTranslations("admin.companies.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(pendingJobs.map((j) => j.id));
  const [pending, start] = useTransition();
  const notify = (ok: boolean, msg: string) => toast({ title: ok ? msg : tc("errors.generic"), variant: ok ? "success" : "danger" });

  return (
    <div className="flex flex-wrap gap-2">
      {company.status !== "verified" ? <Button variant="accent" onClick={() => setOpen(true)}>{t("verify")}</Button> : null}
      {company.status !== "suspended" ? (
        <ConfirmButton variant="outline" title={t("suspend")} description={t("suspendConfirm")} onConfirm={async () => { const r = await setCompanyStatus(company.id, "suspended"); notify(r.ok, t("suspended")); router.refresh(); }}>
          {t("suspend")}
        </ConfirmButton>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => start(async () => { const r = await setCompanyStatus(company.id, "verified"); notify(r.ok, t("reinstated")); router.refresh(); })}>{t("reinstate")}</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <DialogHeader>
            <DialogTitle>{t("verifyTitle", { company: company.name })}</DialogTitle>
            <DialogDescription>{t("verifyBody")}</DialogDescription>
          </DialogHeader>
          {pendingJobs.length > 0 ? (
            <ul className="grid gap-2">
              {pendingJobs.map((job) => (
                <li key={job.id}>
                  <label htmlFor={`pub-${job.id}`} className="flex items-center gap-3 rounded-[10px] border border-border p-3 text-sm">
                    <Checkbox id={`pub-${job.id}`} checked={selected.includes(job.id)} onCheckedChange={(c) => setSelected((prev) => (c ? [...prev, job.id] : prev.filter((id) => id !== job.id)))} />
                    {job.title}
                  </label>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("noJobs")}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{tc("actions.cancel")}</Button>
            <Button variant="accent" disabled={pending} onClick={() => start(async () => { const r = await verifyCompany({ company_id: company.id, publish_job_ids: selected }); notify(r.ok, t("verified")); setOpen(false); router.refresh(); })}>{t("verify")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
