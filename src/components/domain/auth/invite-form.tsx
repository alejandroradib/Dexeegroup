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
import { acceptInviteSchema, type AcceptInviteInput } from "@/lib/validation/auth";
import { acceptInvite, acceptInviteSignedIn } from "@/server/actions/auth";

export function InviteForm({ token, email, signedInEmail }: { token: string; email: string; signedInEmail?: string }) {
  const t = useTranslations("auth.invite");
  const te = useTranslations("auth.errors");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<AcceptInviteInput>({ resolver: zodResolver(acceptInviteSchema), defaultValues: { token, full_name: "", password: "" } });

  if (signedInEmail) {
    return (
      <div className="grid gap-4">
        <Alert>{t("alreadySignedIn", { email: signedInEmail })}</Alert>
        {error ? <Alert variant="danger">{te.has(error as "generic") ? te(error as "generic") : te("generic")}</Alert> : null}
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await acceptInviteSignedIn(token);
              if (result.ok) window.location.assign(result.data.redirectTo);
              else setError(result.error);
            })
          }
        >
          {t("accept")}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const result = await acceptInvite(values);
          if (result.ok) window.location.assign(result.data.redirectTo);
          else setError(result.error);
        }),
      )}
      className="grid gap-4"
      noValidate
    >
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="full_name">{t("fullName")}</Label>
        <Input id="full_name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.full_name)} {...form.register("full_name")} />
        <FieldError error={form.formState.errors.full_name?.message} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register("password")} />
        <FieldError error={form.formState.errors.password?.message} />
      </div>
      {error ? <Alert variant="danger">{te.has(error as "generic") ? te(error as "generic") : te("generic")}</Alert> : null}
      <Button type="submit" disabled={pending} className="w-full">{t("submit")}</Button>
    </form>
  );
}
