"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { professionalStepSchema, type ProfessionalStepInput } from "@/lib/validation/candidate";
import { ROLE_FAMILIES } from "@/lib/validation/enums";
import { saveProfessionalStep } from "@/server/actions/candidate";
import type { CandidateProfile } from "@/server/services/candidates";

export function ProfessionalStep({ profile, suggestions, onNext, onBack }: { profile: CandidateProfile; suggestions: string[]; onNext: () => void; onBack: () => void }) {
  const t = useTranslations("candidate.onboarding.professional");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const form = useForm<ProfessionalStepInput>({
    resolver: zodResolver(professionalStepSchema),
    defaultValues: {
      headline: profile.candidate.headline ?? "",
      summary: profile.candidate.summary ?? "",
      role_family: profile.candidate.role_family ?? undefined,
      skills: profile.candidate.skills ?? [],
      years_experience: profile.candidate.years_experience ?? undefined,
    },
  });
  const e = form.formState.errors;
  return (
    <form
      onSubmit={form.handleSubmit((values) => start(async () => {
        const result = await saveProfessionalStep(values);
        if (result.ok) onNext();
        else toast({ title: tc("errors.generic"), variant: "danger" });
      }))}
      className="grid gap-5"
      noValidate
    >
      <FormField id="headline" label={t("headline")} error={e.headline?.message}><Input id="headline" placeholder={t("headlinePlaceholder")} {...form.register("headline")} /></FormField>
      <FormField id="summary" label={t("summary")} hint={t("summaryHint")} error={e.summary?.message}><Textarea id="summary" rows={5} {...form.register("summary")} /></FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="role_family" label={t("roleFamily")} error={e.role_family?.message}>
          <NativeSelect id="role_family" placeholder={tc("labels.none")} options={ROLE_FAMILIES.map((v) => ({ value: v, label: te(`role_family.${v}`) }))} {...form.register("role_family", { setValueAs: (v) => v || undefined })} />
        </FormField>
        <FormField id="years_experience" label={t("years")} error={e.years_experience?.message}>
          <Input id="years_experience" type="number" min={0} max={60} step={0.5} inputMode="decimal" {...form.register("years_experience", { valueAsNumber: true })} />
        </FormField>
      </div>
      <Controller control={form.control} name="skills" render={({ field }) => (
        <FormField id="skills" label={t("skills")} hint={t("skillsHint")} error={e.skills?.message}>
          <TagInput id="skills" value={field.value} onChange={field.onChange} suggestions={suggestions} max={25} removeLabel={tc("actions.remove")} aria-invalid={Boolean(e.skills)} />
        </FormField>
      )} />
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>{tc("actions.back")}</Button>
        <Button type="submit" disabled={pending}>{tc("actions.continue")}</Button>
      </div>
    </form>
  );
}
