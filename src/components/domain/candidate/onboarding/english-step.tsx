"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/toast";
import { englishStepSchema, type EnglishStepInput } from "@/lib/validation/candidate";
import { CEFR_LEVELS } from "@/lib/validation/enums";
import { saveEnglishStep } from "@/server/actions/candidate";
import type { CandidateProfile } from "@/server/services/candidates";

export function EnglishStep({
  profile,
  onNext,
  onBack,
}: {
  profile: CandidateProfile;
  onNext: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("candidate.onboarding.english");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const form = useForm<EnglishStepInput>({
    resolver: zodResolver(englishStepSchema),
    defaultValues: {
      english_self_level: profile.candidate.english_self_level ?? undefined,
      desired_roles: profile.candidate.desired_roles ?? [],
    },
  });
  const e = form.formState.errors;
  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const result = await saveEnglishStep(values);
          if (result.ok) onNext();
          else toast({ title: tc("errors.generic"), variant: "danger" });
        }),
      )}
      className="grid gap-6"
      noValidate
    >
      <Controller
        control={form.control}
        name="english_self_level"
        render={({ field }) => (
          <fieldset>
            <legend className="text-navy text-sm font-medium">{t("level")}</legend>
            <p className="text-muted-foreground mt-1 mb-3 text-xs">{t("levelHint")}</p>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="sm:grid-cols-2"
            >
              {CEFR_LEVELS.map((level) => (
                <label
                  key={level}
                  htmlFor={`cefr-${level}`}
                  className="border-border has-[[data-state=checked]]:border-navy has-[[data-state=checked]]:bg-mist flex cursor-pointer items-start gap-3 rounded-[12px] border p-3"
                >
                  <RadioGroupItem value={level} id={`cefr-${level}`} className="mt-0.5" />
                  <span>
                    <span className="text-navy block text-sm font-semibold">
                      {te(`cefr_level.${level}`)}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {te(`cefr_description.${level}`)}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            {e.english_self_level ? (
              <p className="text-destructive mt-1 text-xs" role="alert">
                {tc("labels.required")}
              </p>
            ) : null}
          </fieldset>
        )}
      />
      <Controller
        control={form.control}
        name="desired_roles"
        render={({ field }) => (
          <FormField
            id="desired_roles"
            label={t("desiredRoles")}
            hint={t("desiredRolesHint")}
            error={e.desired_roles?.message}
          >
            <TagInput
              id="desired_roles"
              value={field.value}
              onChange={field.onChange}
              max={10}
              removeLabel={tc("actions.remove")}
              aria-invalid={Boolean(e.desired_roles)}
            />
          </FormField>
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
