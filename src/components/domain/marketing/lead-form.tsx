"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUDGET_BANDS, NEEDED_BY, leadSchema, type LeadInput } from "@/lib/validation/lead";
import { createLead } from "@/server/actions/leads";

const SENIORITIES = ["junior", "mid", "senior", "lead"] as const;
const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 flex h-10 w-full rounded-[10px] border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

/**
 * Six fields, no phone (PHASES-GTM 9.4). The promise next to the submit button is the
 * point of the form: it is what Dexee is committing to in exchange for the details, and
 * `/admin/leads` measures against it.
 */
export function LeadForm() {
  const t = useTranslations("marketing.lead");
  const te = useTranslations("enums");
  const tc = useTranslations("common.errors");
  const fieldId = useId();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error" | "rateLimited">("idle");

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      role_to_fill: "",
      seniority: "mid",
      budget_band: "not_sure",
      needed_by: "one_month",
      website: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    start(async () => {
      const result = await createLead(values);
      if (result.ok) {
        setStatus("success");
        form.reset();
      } else if (result.error === "rateLimited") setStatus("rateLimited");
      else setStatus("error");
    });
  });

  if (status === "success") {
    return (
      <Alert variant="success">
        <p className="font-semibold">{t("successTitle")}</p>
        <p className="mt-1">{t("successBody")}</p>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-name`}>{t("name")}</Label>
          <Input
            id={`${fieldId}-name`}
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
          <FieldError error={form.formState.errors.name?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-email`}>{t("email")}</Label>
          <Input
            id={`${fieldId}-email`}
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
          <FieldError error={form.formState.errors.email?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-company`}>{t("company")}</Label>
          <Input
            id={`${fieldId}-company`}
            autoComplete="organization"
            aria-invalid={Boolean(form.formState.errors.company)}
            {...form.register("company")}
          />
          <FieldError error={form.formState.errors.company?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-role`}>{t("roleToFill")}</Label>
          <Input
            id={`${fieldId}-role`}
            placeholder={t("roleToFillPlaceholder")}
            aria-invalid={Boolean(form.formState.errors.role_to_fill)}
            {...form.register("role_to_fill")}
          />
          <FieldError error={form.formState.errors.role_to_fill?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-seniority`}>{t("seniority")}</Label>
          <select
            id={`${fieldId}-seniority`}
            className={SELECT_CLASS}
            {...form.register("seniority")}
          >
            {SENIORITIES.map((value) => (
              <option key={value} value={value}>
                {te(`seniority.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-budget`}>{t("budgetBand")}</Label>
          <select
            id={`${fieldId}-budget`}
            className={SELECT_CLASS}
            {...form.register("budget_band")}
          >
            {BUDGET_BANDS.map((value) => (
              <option key={value} value={value}>
                {t(`budget.${value}` as "budget.not_sure")}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-needed`}>{t("neededBy")}</Label>
          <select id={`${fieldId}-needed`} className={SELECT_CLASS} {...form.register("needed_by")}>
            {NEEDED_BY.map((value) => (
              <option key={value} value={value}>
                {t(`timing.${value}` as "timing.exploring")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden" aria-hidden>
        <label htmlFor={`${fieldId}-website`}>Website</label>
        <input
          id={`${fieldId}-website`}
          tabIndex={-1}
          autoComplete="off"
          {...form.register("website")}
        />
      </div>

      {status === "error" ? <Alert variant="danger">{t("error")}</Alert> : null}
      {status === "rateLimited" ? <Alert variant="warning">{tc("rateLimited")}</Alert> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" variant="accent" disabled={pending} className="sm:shrink-0">
          {t("submit")}
        </Button>
        <p className="text-muted-foreground text-sm">{t("promise")}</p>
      </div>
    </form>
  );
}
