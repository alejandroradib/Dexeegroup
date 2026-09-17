"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormField } from "@/components/shared/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { educationSchema, type EducationInput } from "@/lib/validation/candidate";
import { deleteEducation, upsertEducation } from "@/server/actions/candidate";
import type { CandidateEducation } from "@/server/services/candidates";

export function EducationStep({ rows, onNext, onBack }: { rows: CandidateEducation[]; onNext: () => void; onBack: () => void }) {
  const t = useTranslations("candidate.onboarding.education");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<EducationInput>({ resolver: zodResolver(educationSchema), defaultValues: { institution: "", degree: "", field: "" } });
  const e = form.formState.errors;

  const save = form.handleSubmit((values) => start(async () => {
    const result = await upsertEducation(values);
    if (result.ok) { setEditing(false); form.reset({ institution: "", degree: "", field: "" }); router.refresh(); } else toast({ title: tc("errors.generic"), variant: "danger" });
  }));

  return (
    <div className="grid gap-5">
      {rows.length === 0 && !editing ? <Alert>{t("empty")}</Alert> : null}
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-border p-4">
            <div>
              <p className="font-medium text-navy">{row.institution}</p>
              <p className="text-sm text-muted-foreground">{[row.degree, row.field].filter(Boolean).join(", ")}{row.start_year || row.end_year ? ` · ${row.start_year ?? ""}${row.end_year ? ` – ${row.end_year}` : ""}` : ""}</p>
            </div>
            <ConfirmButton variant="ghost" size="icon-sm" title={t("removeConfirm")} onConfirm={async () => { await deleteEducation(row.id); router.refresh(); }} aria-label={tc("actions.remove")}>
              <Trash2Icon />
            </ConfirmButton>
          </li>
        ))}
      </ul>
      {editing ? (
        <form onSubmit={save} className="grid gap-4 rounded-[12px] border border-navy/30 bg-mist/50 p-4" noValidate>
          <FormField id="edu_institution" label={t("institution")} error={e.institution?.message}><Input id="edu_institution" {...form.register("institution")} /></FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="edu_degree" label={t("degree")} optional={tc("labels.optional")}><Input id="edu_degree" {...form.register("degree")} /></FormField>
            <FormField id="edu_field" label={t("field")} optional={tc("labels.optional")}><Input id="edu_field" {...form.register("field")} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="edu_start" label={t("startYear")} optional={tc("labels.optional")} error={e.start_year?.message}><Input id="edu_start" type="number" min={1950} max={2100} {...form.register("start_year", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} /></FormField>
            <FormField id="edu_end" label={t("endYear")} optional={tc("labels.optional")} error={e.end_year?.message}><Input id="edu_end" type="number" min={1950} max={2100} {...form.register("end_year", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} /></FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{tc("actions.cancel")}</Button>
            <Button type="submit" disabled={pending}>{tc("actions.save")}</Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setEditing(true)} className="justify-self-start"><PlusIcon /> {t("add")}</Button>
      )}
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>{tc("actions.back")}</Button>
        <Button type="button" onClick={onNext}>{tc("actions.continue")}</Button>
      </div>
    </div>
  );
}
