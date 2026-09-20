"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm, type Control, type FieldPath } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics/events";
import { CONSENT_VERSION } from "@/lib/legal";
import { signUpCandidateSchema, type SignUpCandidateInput } from "@/lib/validation/auth";
import { COUNTRIES } from "@/lib/validation/enums";
import { signUpCandidate } from "@/server/actions/auth";

type ConsentField = Extract<FieldPath<SignUpCandidateInput>, `consent_${string}`>;

function ConsentRow({
  control,
  name,
  label,
  error,
  required,
}: {
  control: Control<SignUpCandidateInput>;
  name: ConsentField;
  label: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="grid gap-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id={name}
              checked={field.value === true}
              onCheckedChange={(v) =>
                field.onChange(required ? (v === true ? true : undefined) : v === true)
              }
              aria-invalid={Boolean(error)}
            />
            <Label htmlFor={name} className="text-sm leading-snug font-normal">
              {label}
            </Label>
          </div>
          <div className="pl-8">
            <FieldError error={error} />
          </div>
        </div>
      )}
    />
  );
}

export function SignUpCandidateForm({ next }: { next?: string }) {
  const t = useTranslations("auth.signUpCandidate");
  const te = useTranslations("auth.errors");
  const tc = useTranslations("enums.country");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpCandidateInput>({
    resolver: zodResolver(signUpCandidateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      country: "CO",
      consent_terms: undefined as unknown as true,
      consent_data: undefined as unknown as true,
      consent_job_contact: false,
      consent_analytics: false,
      next,
    },
  });
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const result = await signUpCandidate(values);
      if (result.ok) {
        track("start_candidate_signup");
        router.push({ pathname: "/verify-email", query: { email: result.data.email } });
      } else setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="first_name">{t("firstName")}</Label>
          <Input
            id="first_name"
            autoComplete="given-name"
            aria-invalid={Boolean(e.first_name)}
            {...form.register("first_name")}
          />
          <FieldError error={e.first_name?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="last_name">{t("lastName")}</Label>
          <Input
            id="last_name"
            autoComplete="family-name"
            aria-invalid={Boolean(e.last_name)}
            {...form.register("last_name")}
          />
          <FieldError error={e.last_name?.message} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(e.email)}
            {...form.register("email")}
          />
          <FieldError error={e.email?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="country">{t("country")}</Label>
          <NativeSelect
            id="country"
            options={COUNTRIES.map((c) => ({ value: c, label: tc(c) }))}
            {...form.register("country")}
          />
          <FieldError error={e.country?.message} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-describedby="password-hint"
          aria-invalid={Boolean(e.password)}
          {...form.register("password")}
        />
        <p id="password-hint" className="text-muted-foreground text-xs">
          {t("passwordHint")}
        </p>
        <FieldError error={e.password?.message} />
      </div>
      <fieldset className="border-border bg-mist grid gap-3 rounded-[12px] border p-4">
        <legend className="text-navy px-1 text-sm font-medium">{t("consentTitle")}</legend>
        <ConsentRow
          control={form.control}
          name="consent_terms"
          required
          label={t.rich("consentTerms", {
            terms: (chunks) => (
              <Link href="/terms" className="text-link underline" target="_blank">
                {chunks}
              </Link>
            ),
          })}
          error={e.consent_terms?.message}
        />
        <ConsentRow
          control={form.control}
          name="consent_data"
          required
          label={t.rich("consentData", {
            privacy: (chunks) => (
              <Link href="/privacy" className="text-link underline" target="_blank">
                {chunks}
              </Link>
            ),
          })}
          error={e.consent_data?.message}
        />
        <ConsentRow
          control={form.control}
          name="consent_job_contact"
          label={t("consentJobContact")}
        />
        <ConsentRow control={form.control} name="consent_analytics" label={t("consentAnalytics")} />
        <p className="text-muted-foreground text-xs">
          {t("consentRequiredHint")} {t("consentDetail", { version: CONSENT_VERSION })}
        </p>
      </fieldset>
      {error ? (
        <Alert variant="danger">
          {te.has(error as "generic") ? te(error as "generic") : te("generic")}
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
