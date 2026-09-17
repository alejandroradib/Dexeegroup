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
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordInput, type ResetPasswordInput } from "@/lib/validation/auth";
import { forgotPassword, resendVerification, resetPassword } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const [pending, start] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  if (sentTo) return <Alert variant="success">{t("sent", { email: sentTo })}</Alert>;
  return (
    <form onSubmit={form.handleSubmit((values) => start(async () => { await forgotPassword(values); setSentTo(values.email); }))} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
        <FieldError error={form.formState.errors.email?.message} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">{t("submit")}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm: "" } });
  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const result = await resetPassword(values);
          if (result.ok) window.location.assign(result.data.redirectTo);
          else setError(result.error);
        }),
      )}
      className="grid gap-4"
      noValidate
    >
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
        <FieldError error={form.formState.errors.password?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">{t("confirm")}</Label>
        <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(form.formState.errors.confirm)} {...form.register("confirm")} />
        <FieldError error={form.formState.errors.confirm?.message} />
      </div>
      {error ? (
        <Alert variant="danger">
          {t("invalidLink")} <Link href="/forgot-password" className="font-semibold underline">{t("requestNew")}</Link>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">{t("submit")}</Button>
    </form>
  );
}

export function ResendVerificationButton({ email }: { email: string }) {
  const t = useTranslations("auth.verify");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <p className="text-sm text-success">{t("resent")}</p>;
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => { await resendVerification(email); setDone(true); })}>
      {t("resend")}
    </Button>
  );
}
