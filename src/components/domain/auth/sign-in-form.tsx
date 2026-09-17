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
import { Link } from "@/i18n/navigation";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { resendVerification, signIn } from "@/server/actions/auth";

export function SignInForm({ next }: { next?: string }) {
  const t = useTranslations("auth.signIn");
  const te = useTranslations("auth.errors");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", next },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const result = await signIn(values);
      if (result.ok) {
        window.location.assign(result.data.redirectTo);
        return;
      }
      setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("password")}</Label>
          <Link href="/forgot-password" className="text-link text-xs hover:underline">
            {t("forgot")}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
        <FieldError error={form.formState.errors.password?.message} />
      </div>
      {error === "invalidCredentials" ? (
        <Alert variant="danger">{t("invalidCredentials")}</Alert>
      ) : null}
      {error === "emailNotConfirmed" ? (
        <Alert variant="warning">
          {t("emailNotConfirmed")}{" "}
          {resent ? null : (
            <button
              type="button"
              className="font-semibold underline"
              onClick={() =>
                start(async () => {
                  await resendVerification(form.getValues("email"));
                  setResent(true);
                })
              }
            >
              {t("resend")}
            </button>
          )}
        </Alert>
      ) : null}
      {error && !["invalidCredentials", "emailNotConfirmed"].includes(error) ? (
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
