"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { placementSchema, type PlacementInput } from "@/lib/validation/admin";
import { CONTRACT_TYPES } from "@/lib/validation/enums";
import { createPlacement, endPlacement } from "@/server/actions/admin";

export function RecordPlacementDialog({ applicationId, candidate, defaultContract }: { applicationId: string; candidate: string; defaultContract?: PlacementInput["contract_type"] }) {
  const t = useTranslations("admin.placements");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<PlacementInput>({ resolver: zodResolver(placementSchema), defaultValues: { application_id: applicationId, contract_type: defaultContract, start_date: new Date().toISOString().slice(0, 10) } });
  const e = form.formState.errors;
  return (
    <>
      <Button size="sm" variant="accent" onClick={() => setOpen(true)}>{t("record")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <form onSubmit={form.handleSubmit((values) => start(async () => { const r = await createPlacement(values); toast({ title: r.ok ? t("created") : tc("errors.generic"), variant: r.ok ? "success" : "danger" }); setOpen(false); router.refresh(); }))} className="grid gap-4" noValidate>
            <DialogHeader><DialogTitle>{t("recordTitle", { candidate })}</DialogTitle></DialogHeader>
            <FormField id="contract_type" label={t("contractType")} error={e.contract_type?.message}>
              <NativeSelect id="contract_type" placeholder={tc("labels.none")} options={CONTRACT_TYPES.map((v) => ({ value: v, label: te(`contract_type.${v}`) }))} {...form.register("contract_type", { setValueAs: (v) => v || undefined })} />
            </FormField>
            <FormField id="start_date" label={t("startDate")} error={e.start_date?.message}><Input id="start_date" type="date" {...form.register("start_date")} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="monthly_salary_usd" label={t("monthlySalary")} error={e.monthly_salary_usd?.message}><Input id="monthly_salary_usd" type="number" min={0} {...form.register("monthly_salary_usd", { valueAsNumber: true })} /></FormField>
              <FormField id="monthly_bill_rate_usd" label={t("monthlyBillRate")} error={e.monthly_bill_rate_usd?.message}><Input id="monthly_bill_rate_usd" type="number" min={0} {...form.register("monthly_bill_rate_usd", { valueAsNumber: true })} /></FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tc("actions.cancel")}</Button>
              <Button type="submit" disabled={pending}>{t("record")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EndPlacementButton({ placementId }: { placementId: string }) {
  const t = useTranslations("admin.placements");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{t("end")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <DialogHeader><DialogTitle>{t("end")}</DialogTitle></DialogHeader>
          <FormField id="end_date" label={t("endDate")}><Input id="end_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{tc("actions.cancel")}</Button>
            <Button disabled={pending} onClick={() => start(async () => { const r = await endPlacement({ placement_id: placementId, end_date: date }); toast({ title: r.ok ? t("ended") : tc("errors.generic"), variant: r.ok ? "success" : "danger" }); setOpen(false); router.refresh(); })}>{t("end")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
