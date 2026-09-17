"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { adminInviteSchema, type AdminInviteInput } from "@/lib/validation/admin";
import { deactivateAdmin, inviteAdmin } from "@/server/actions/admin";

export function InviteAdminForm() {
  const t = useTranslations("admin.team");
  const tc = useTranslations("common");
  const ta = useTranslations("auth.errors");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const form = useForm<AdminInviteInput>({
    resolver: zodResolver(adminInviteSchema),
    defaultValues: { email: "", full_name: "" },
  });
  return (
    <form
      className="border-border grid gap-4 rounded-[12px] border bg-white p-5"
      noValidate
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const r = await inviteAdmin(values);
          toast({
            title: r.ok
              ? t("invited")
              : r.error === "emailTaken"
                ? ta("emailTaken")
                : tc("errors.generic"),
            variant: r.ok ? "success" : "danger",
          });
          if (r.ok) form.reset();
          router.refresh();
        }),
      )}
    >
      <h2 className="text-base">{t("invite")}</h2>
      <FormField
        id="admin_full_name"
        label={t("fullName")}
        error={form.formState.errors.full_name?.message}
      >
        <Input id="admin_full_name" {...form.register("full_name")} />
      </FormField>
      <FormField id="admin_email" label={t("email")} error={form.formState.errors.email?.message}>
        <Input id="admin_email" type="email" {...form.register("email")} />
      </FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {t("invite")}
      </Button>
    </form>
  );
}

export function DeactivateAdminButton({ userId }: { userId: string }) {
  const t = useTranslations("admin.team");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      className="text-danger"
      title={t("deactivate")}
      description={t("deactivateConfirm")}
      onConfirm={async () => {
        const r = await deactivateAdmin(userId);
        toast({
          title: r.ok ? t("deactivated") : tc("errors.generic"),
          variant: r.ok ? "success" : "danger",
        });
        router.refresh();
      }}
    >
      {t("deactivate")}
    </ConfirmButton>
  );
}
