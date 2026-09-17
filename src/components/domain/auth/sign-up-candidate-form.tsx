"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { CONSENT_VERSION } from "@/lib/legal";
import { signUpCandidateSchema, type SignUpCandidateInput } from "@/lib/validation/auth";
import { signUpCandidate } from "@/server/actions/auth";

export function SignUpCandidateForm({ next }: { next?: string }) {
  const t = useTranslations("auth.signUpCandidate");
  const te = useTranslations("auth.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpCandidateInput>({
    resolver: zodResolver(signUpCandidateSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "", consent: undefined as unknown as true, next },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const result = await signUpCandidate(values);
      if (result.ok) router.push({ pathname: "/verify-email", query: { email: result.data.email } });
      else setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="first_name">{t("firstName")}</Label>
          <Input id="first_name" autoComplete="given-name" aria-invalid={Boolean(form.formState.errors.first_name)} {...form.register("first_name")} />
          <FieldError error={form.formState.errors.first_name?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="last_name">{t("lastName")}</Label>
          <Input id="last_name" autoComplete="family-name" aria-invalid={Boolean(form.formState.errors.last_name)} {...form.register("last_name")} />
          <FieldError error={form.formState.errors.last_name?.message} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
        <FieldError error={form.formState.errors.email?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" autoComplete="new-password" aria-describedby="password-hint" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
        <p id="password-hint" className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        <FieldError error={form.formState.errors.password?.message} />
      </div>
      <Controller
        control={form.control}
        name="consent"
        render={({ field }) => (
          <div className="rounded-[12px] border border-border bg-mist p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="consent" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true ? true : undefined)} aria-invalid={Boolean(form.formState.errors.consent)} aria-describedby="consent-detail" />
              <Label htmlFor="consent" className="text-sm leading-snug font-normal">{t("consentLabel")}</Label>
            </div>
            <p id="consent-detail" className="mt-2 pl-8 text-xs text-muted-foreground">
              {t("consentDetail", { version: CONSENT_VERSION })}{" "}
              <Link href="/privacy" className="text-link underline" target="_blank">{t("consentLink")}</Link>
            </p>
            <div className="pl-8"><FieldError error={form.formState.errors.consent?.message} /></div>
          </div>
        )}
      />
      {error ? <Alert variant="danger">{te.has(error as "generic") ? te(error as "generic") : te("generic")}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full">{t("submit")}</Button>
    </form>
  );
}
