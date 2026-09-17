"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Stepper } from "@/components/shared/stepper";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  companyDetailsSchema,
  hiringNeedsSchema,
  type CompanyDetailsInput,
  type HiringNeedsInput,
} from "@/lib/validation/company";
import { COMPANY_SIZES, CONTRACT_TYPES, ROLE_FAMILIES, SECTORS } from "@/lib/validation/enums";
import { completeCompanyOnboarding } from "@/server/actions/company";
import type { Company } from "@/server/services/companies";

type Props = { company: Company | null; defaultName: string };

export function CompanyOnboardingForm({ company, defaultName }: Props) {
  const t = useTranslations("company.onboarding");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const details = useForm<CompanyDetailsInput>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      name: company?.name ?? defaultName,
      legal_name: company?.legal_name ?? "",
      website: company?.website ?? "",
      sector: company?.sector ?? undefined,
      country: company?.country ?? "US",
      state: company?.state ?? "",
      city: company?.city ?? "",
      size: company?.size ?? undefined,
      description: company?.description ?? "",
    },
  });
  const needsDefault = (company?.hiring_needs ?? {}) as Partial<HiringNeedsInput>;
  const needs = useForm<HiringNeedsInput>({
    resolver: zodResolver(hiringNeedsSchema),
    defaultValues: {
      role_families: needsDefault.role_families ?? [],
      expected_hires: needsDefault.expected_hires,
      preferred_contract_types: needsDefault.preferred_contract_types ?? [],
    },
  });

  const steps = [
    { id: "details", label: t("stepDetails") },
    { id: "needs", label: t("stepNeeds") },
  ];

  const finish = needs.handleSubmit((needsValues) => {
    setError(null);
    start(async () => {
      const result = await completeCompanyOnboarding({
        details: details.getValues(),
        hiring_needs: needsValues,
      });
      if (result.ok) {
        toast({ title: t("saved"), variant: "success" });
        router.push("/company");
        router.refresh();
      } else setError(result.error);
    });
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper steps={steps} current={step} onSelect={setStep} className="mb-8" />
      {step === 0 ? (
        <form
          onSubmit={details.handleSubmit(() => setStep(1))}
          className="border-border grid gap-5 rounded-[12px] border bg-white p-6"
          noValidate
        >
          <FormField id="name" label={t("name")} error={details.formState.errors.name?.message}>
            <Input
              id="name"
              {...details.register("name")}
              aria-invalid={Boolean(details.formState.errors.name)}
            />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="legal_name"
              label={t("legalName")}
              optional={tc("labels.optional")}
              error={details.formState.errors.legal_name?.message}
            >
              <Input id="legal_name" {...details.register("legal_name")} />
            </FormField>
            <FormField
              id="website"
              label={t("website")}
              optional={tc("labels.optional")}
              error={details.formState.errors.website?.message}
            >
              <Input
                id="website"
                type="url"
                placeholder="https://"
                {...details.register("website")}
                aria-invalid={Boolean(details.formState.errors.website)}
              />
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="sector"
              label={t("sector")}
              error={details.formState.errors.sector?.message}
            >
              <NativeSelect
                id="sector"
                placeholder={t("select")}
                options={SECTORS.map((v) => ({ value: v, label: te(`sector.${v}`) }))}
                {...details.register("sector", { setValueAs: (v) => v || undefined })}
              />
            </FormField>
            <FormField id="size" label={t("size")} error={details.formState.errors.size?.message}>
              <NativeSelect
                id="size"
                placeholder={t("select")}
                options={COMPANY_SIZES.map((v) => ({ value: v, label: te(`company_size.${v}`) }))}
                {...details.register("size", { setValueAs: (v) => v || undefined })}
              />
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              id="country"
              label={t("country")}
              error={details.formState.errors.country?.message}
            >
              <Input id="country" maxLength={2} {...details.register("country")} />
            </FormField>
            <FormField id="state" label={t("state")} optional={tc("labels.optional")}>
              <Input id="state" {...details.register("state")} />
            </FormField>
            <FormField id="city" label={t("city")} optional={tc("labels.optional")}>
              <Input id="city" {...details.register("city")} />
            </FormField>
          </div>
          <FormField
            id="description"
            label={t("description")}
            hint={t("descriptionHint")}
            optional={tc("labels.optional")}
            error={details.formState.errors.description?.message}
          >
            <Textarea id="description" rows={4} {...details.register("description")} />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit">{tc("actions.continue")}</Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={finish}
          className="border-border grid gap-6 rounded-[12px] border bg-white p-6"
          noValidate
        >
          <fieldset className="grid gap-2">
            <legend className="text-navy mb-2 text-sm font-medium">{t("roleFamilies")}</legend>
            <Controller
              control={needs.control}
              name="role_families"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {ROLE_FAMILIES.map((rf) => (
                    <label key={rf} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(rf)}
                        onCheckedChange={(c) =>
                          field.onChange(
                            c ? [...field.value, rf] : field.value.filter((v) => v !== rf),
                          )
                        }
                      />
                      {te(`role_family.${rf}`)}
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>
          <FormField
            id="expected_hires"
            label={t("expectedHires")}
            optional={tc("labels.optional")}
            error={needs.formState.errors.expected_hires?.message}
          >
            <Input
              id="expected_hires"
              type="number"
              min={0}
              inputMode="numeric"
              className="max-w-[160px]"
              {...needs.register("expected_hires", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          </FormField>
          <fieldset className="grid gap-2">
            <legend className="text-navy mb-2 text-sm font-medium">{t("contractTypes")}</legend>
            <Controller
              control={needs.control}
              name="preferred_contract_types"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {CONTRACT_TYPES.map((ct) => (
                    <label key={ct} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(ct)}
                        onCheckedChange={(c) =>
                          field.onChange(
                            c ? [...field.value, ct] : field.value.filter((v) => v !== ct),
                          )
                        }
                      />
                      {te(`contract_type.${ct}`)}
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>
          {error ? <Alert variant="danger">{tc("errors.generic")}</Alert> : null}
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              {tc("actions.back")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("finish")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
