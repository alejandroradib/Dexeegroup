"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { CandidateSettingsPrivacy } from "@/components/domain/candidate/candidate-settings-privacy";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  accountSchema,
  changePasswordSchema,
  type AccountInput,
  type ChangePasswordInput,
} from "@/lib/validation/candidate";
import { changePassword, updateAccount } from "@/server/actions/candidate";
import { updateNotificationPrefs } from "@/server/actions/company";
import type { Candidate } from "@/server/services/candidates";
import type { Database } from "@/types/database";

type DataRequest = Database["public"]["Tables"]["data_requests"]["Row"];
type Props = {
  candidate: Candidate;
  email: string;
  fullName: string;
  locale: "en" | "es";
  workstyleAttempt: { id: string; visible_to_companies: boolean } | null;
  discAttempt: { id: string; visible_to_companies: boolean } | null;
  dataRequests: DataRequest[];
  prefs: { digest: boolean; application_updates: boolean };
  initialTab?: string;
};

export function CandidateSettings({
  candidate,
  email,
  fullName,
  locale,
  workstyleAttempt,
  discAttempt,
  dataRequests,
  prefs,
  initialTab,
}: Props) {
  const t = useTranslations("candidate.settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const account = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: { full_name: fullName, locale },
  });
  const password = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });
  const prefsForm = useForm<{ digest: boolean; application_updates: boolean }>({
    defaultValues: prefs,
  });

  const notify = (ok: boolean, success: string) =>
    toast({ title: ok ? success : tc("errors.generic"), variant: ok ? "success" : "danger" });

  return (
    <Tabs defaultValue={initialTab ?? "account"}>
      <TabsList>
        <TabsTrigger value="account">{t("tabs.account")}</TabsTrigger>
        <TabsTrigger value="privacy">{t("tabs.privacy")}</TabsTrigger>
        <TabsTrigger value="notifications">{t("tabs.notifications")}</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="grid max-w-lg gap-6">
        <form
          className="border-border grid gap-4 rounded-[12px] border bg-white p-6"
          noValidate
          onSubmit={account.handleSubmit((v) =>
            start(async () => {
              const r = await updateAccount(v);
              notify(r.ok, t("account.saved"));
              router.refresh();
            }),
          )}
        >
          <FormField
            id="full_name"
            label={t("account.fullName")}
            error={account.formState.errors.full_name?.message}
          >
            <Input id="full_name" {...account.register("full_name")} />
          </FormField>
          <FormField id="email" label={t("account.email")} hint={t("account.emailHint")}>
            <Input id="email" value={email} readOnly disabled />
          </FormField>
          <FormField id="locale" label={t("account.locale")}>
            <NativeSelect
              id="locale"
              options={[
                { value: "en", label: tc("labels.english") },
                { value: "es", label: tc("labels.spanish") },
              ]}
              {...account.register("locale")}
            />
          </FormField>
          <Button type="submit" disabled={pending} className="justify-self-start">
            {tc("actions.save")}
          </Button>
        </form>
        <form
          className="border-border grid gap-4 rounded-[12px] border bg-white p-6"
          noValidate
          onSubmit={password.handleSubmit((v) =>
            start(async () => {
              const r = await changePassword(v);
              if (!r.ok && r.error === "passwordIncorrect") {
                password.setError("current", { message: "passwordIncorrect" });
                return;
              }
              notify(r.ok, t("account.passwordSaved"));
              password.reset();
            }),
          )}
        >
          <h3 className="text-navy text-sm font-semibold">{t("account.password")}</h3>
          <FormField
            id="current_password"
            label={t("account.currentPassword")}
            error={password.formState.errors.current?.message}
          >
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              {...password.register("current")}
            />
          </FormField>
          <FormField
            id="new_password"
            label={t("account.newPassword")}
            error={password.formState.errors.password?.message}
          >
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              {...password.register("password")}
            />
          </FormField>
          <FormField
            id="confirm_password"
            label={t("account.confirm")}
            error={password.formState.errors.confirm?.message}
          >
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              {...password.register("confirm")}
            />
          </FormField>
          <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
            {t("account.password")}
          </Button>
        </form>
      </TabsContent>

      <CandidateSettingsPrivacy
        candidate={candidate}
        workstyleAttempt={workstyleAttempt}
        discAttempt={discAttempt}
        dataRequests={dataRequests}
      />

      <TabsContent value="notifications">
        <form
          className="border-border grid max-w-lg gap-4 rounded-[12px] border bg-white p-6"
          onSubmit={prefsForm.handleSubmit((v) =>
            start(async () => {
              const r = await updateNotificationPrefs(v);
              notify(r.ok, t("notifications.saved"));
            }),
          )}
        >
          <h3 className="text-navy text-sm font-semibold">{t("notifications.title")}</h3>
          <Controller
            control={prefsForm.control}
            name="application_updates"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="application_updates" className="font-normal">
                  {t("notifications.applicationUpdates")}
                </Label>
                <Switch
                  id="application_updates"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          <Controller
            control={prefsForm.control}
            name="digest"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="digest" className="font-normal">
                  {t("notifications.assessmentResults")}
                </Label>
                <Switch id="digest" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
          <Button type="submit" disabled={pending} className="justify-self-start">
            {tc("actions.save")}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
