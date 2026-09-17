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
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { submitContactRequest } from "@/server/actions/marketing/contact";

export function ContactForm() {
  const t = useTranslations("marketing.contact.form");
  const te = useTranslations("enums.request_type");
  const tc = useTranslations("common.errors");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error" | "rateLimited">("idle");
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      request_type: "hire",
      message: "",
      website: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    start(async () => {
      const result = await submitContactRequest(values);
      if (result.ok) {
        setStatus("success");
        form.reset();
      } else if (result.error === "rateLimited") setStatus("rateLimited");
      else setStatus("error");
    });
  });

  if (status === "success") return <Alert variant="success">{t("success")}</Alert>;

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
          <FieldError error={form.formState.errors.name?.message} />
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
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="company">{t("company")}</Label>
          <Input id="company" autoComplete="organization" {...form.register("company")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="request_type">{t("requestType")}</Label>
          <select
            id="request_type"
            className="border-input bg-background flex h-10 w-full rounded-[10px] border px-3 text-sm"
            {...form.register("request_type")}
          >
            {(["hire", "talent", "other"] as const).map((v) => (
              <option key={v} value={v}>
                {te(v)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea
          id="message"
          rows={5}
          placeholder={t("messagePlaceholder")}
          aria-invalid={Boolean(form.formState.errors.message)}
          {...form.register("message")}
        />
        <FieldError error={form.formState.errors.message?.message} />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>
      {status === "error" ? <Alert variant="danger">{t("error")}</Alert> : null}
      {status === "rateLimited" ? <Alert variant="warning">{tc("rateLimited")}</Alert> : null}
      <Button type="submit" variant="accent" disabled={pending} className="justify-self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
