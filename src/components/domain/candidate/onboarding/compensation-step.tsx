"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { compensationStepSchema, type CompensationStepInput } from "@/lib/validation/candidate";
import { AVAILABILITIES, CONTRACT_TYPES } from "@/lib/validation/enums";
import { saveCompensationStep } from "@/server/actions/candidate";
import type { CandidateProfile } from "@/server/services/candidates";

export function CompensationStep({
  profile,
  onNext,
  onBack,
}: {
  profile: CandidateProfile;
  onNext: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("candidate.onboarding.compensation");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const form = useForm<CompensationStepInput>({
    resolver: zodResolver(compensationStepSchema),
    defaultValues: {
      desired_salary_min_usd: profile.candidate.desired_salary_min_usd ?? undefined,
      availability: profile.candidate.availability ?? undefined,
      preferred_contract_types: profile.candidate.preferred_contract_types ?? [],
    },
  });
  const e = form.formState.errors;
  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const result = await saveCompensationStep(values);
          if (result.ok) onNext();
          else toast({ title: tc("errors.generic"), variant: "danger" });
        }),
      )}
      className="grid gap-5"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="desired_salary_min_usd"
          label={t("salary")}
          hint={t("salaryHint")}
          error={e.desired_salary_min_usd?.message}
        >
          <Input
            id="desired_salary_min_usd"
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            {...form.register("desired_salary_min_usd", { valueAsNumber: true })}
          />
        </FormField>
        <FormField id="availability" label={t("availability")} error={e.availability?.message}>
          <NativeSelect
            id="availability"
            placeholder={tc("labels.none")}
            options={AVAILABILITIES.map((v) => ({ value: v, label: te(`availability.${v}`) }))}
            {...form.register("availability", { setValueAs: (v) => v || undefined })}
          />
        </FormField>
      </div>
      <Controller
        control={form.control}
        name="preferred_contract_types"
        render={({ field }) => (
          <fieldset>
            <legend className="text-navy mb-2 text-sm font-medium">{t("contractTypes")}</legend>
            <div className="grid gap-2">
              {CONTRACT_TYPES.map((ct) => (
                <label
                  key={ct}
                  htmlFor={`pct-${ct}`}
                  className="border-border flex items-start gap-3 rounded-[12px] border p-3 text-sm"
                >
                  <Checkbox
                    id={`pct-${ct}`}
                    className="mt-0.5"
                    checked={field.value.includes(ct)}
                    onCheckedChange={(c) =>
                      field.onChange(c ? [...field.value, ct] : field.value.filter((v) => v !== ct))
                    }
                  />
                  <span>
                    <span className="text-navy block font-medium">{te(`contract_type.${ct}`)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {te(`contract_type_description.${ct}`)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {e.preferred_contract_types ? (
              <p className="text-destructive mt-1 text-xs" role="alert">
                {tc("labels.required")}
              </p>
            ) : null}
          </fieldset>
        )}
      />
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          {tc("actions.back")}
        </Button>
        <Button type="submit" disabled={pending}>
          {tc("actions.continue")}
        </Button>
      </div>
    </form>
  );
}
