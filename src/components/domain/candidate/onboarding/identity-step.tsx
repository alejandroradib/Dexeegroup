"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { identityStepSchema, type IdentityStepInput } from "@/lib/validation/candidate";
import { saveIdentityStep } from "@/server/actions/candidate";
import type { CandidateProfile } from "@/server/services/candidates";

export function IdentityStep({ profile, onNext }: { profile: CandidateProfile; onNext: () => void }) {
  const t = useTranslations("candidate.onboarding.identity");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const form = useForm<IdentityStepInput>({
    resolver: zodResolver(identityStepSchema),
    defaultValues: {
      first_name: profile.candidate.first_name,
      last_name: profile.candidate.last_name,
      city: profile.candidate.city ?? "",
      phone: profile.contact?.phone ?? "",
      linkedin_url: profile.contact?.linkedin_url ?? "",
      portfolio_url: profile.contact?.portfolio_url ?? "",
    },
  });
  const e = form.formState.errors;
  return (
    <form
      onSubmit={form.handleSubmit((values) => start(async () => {
        const result = await saveIdentityStep(values);
        if (result.ok) onNext();
        else toast({ title: tc("errors.generic"), variant: "danger" });
      }))}
      className="grid gap-5"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="first_name" label={t("firstName")} error={e.first_name?.message}><Input id="first_name" autoComplete="given-name" {...form.register("first_name")} /></FormField>
        <FormField id="last_name" label={t("lastName")} error={e.last_name?.message}><Input id="last_name" autoComplete="family-name" {...form.register("last_name")} /></FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="city" label={t("city")} error={e.city?.message}><Input id="city" autoComplete="address-level2" {...form.register("city")} /></FormField>
        <FormField id="phone" label={t("phone")} optional={tc("labels.optional")} error={e.phone?.message}><Input id="phone" type="tel" autoComplete="tel" placeholder="+57 300 000 0000" {...form.register("phone")} /></FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="linkedin_url" label={t("linkedin")} optional={tc("labels.optional")} error={e.linkedin_url?.message}><Input id="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/" {...form.register("linkedin_url")} /></FormField>
        <FormField id="portfolio_url" label={t("portfolio")} optional={tc("labels.optional")} error={e.portfolio_url?.message}><Input id="portfolio_url" type="url" placeholder="https://" {...form.register("portfolio_url")} /></FormField>
      </div>
      <p className="text-xs text-muted-foreground">{t("privacy")}</p>
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{tc("actions.continue")}</Button></div>
    </form>
  );
}
