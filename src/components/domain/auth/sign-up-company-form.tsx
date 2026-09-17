"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { signUpCompanySchema, type SignUpCompanyInput } from "@/lib/validation/auth";
import { signUpCompany } from "@/server/actions/auth";

export function SignUpCompanyForm({ next }: { next?: string }) {
  const t = useTranslations("auth.signUpCompany");
  const te = useTranslations("auth.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpCompanyInput>({
    resolver: zodResolver(signUpCompanySchema),
    defaultValues: { full_name: "", company_name: "", email: "", password: "", next },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const result = await signUpCompany(values);
      if (result.ok)
        router.push({ pathname: "/verify-email", query: { email: result.data.email } });
      else setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="full_name">{t("fullName")}</Label>
        <Input
          id="full_name"
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.full_name)}
          {...form.register("full_name")}
        />
        <FieldError error={form.formState.errors.full_name?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="company_name">{t("companyName")}</Label>
        <Input
          id="company_name"
          autoComplete="organization"
          aria-invalid={Boolean(form.formState.errors.company_name)}
          {...form.register("company_name")}
        />
        <FieldError error={form.formState.errors.company_name?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
        <FieldError error={form.formState.errors.email?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-describedby="password-hint"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
        <p id="password-hint" className="text-muted-foreground text-xs">
          {t("passwordHint")}
        </p>
        <FieldError error={form.formState.errors.password?.message} />
      </div>
      <p className="text-muted-foreground text-xs">
        {t.rich("terms", {
          terms: (chunks) => (
            <Link href="/terms" className="text-link underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="text-link underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
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
