"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { accountSchema, changePasswordSchema, dataRequestSchema, type AccountInput, type ChangePasswordInput, type DataRequestInput } from "@/lib/validation/candidate";
import { changePassword, createDataRequest, setCandidateVisibility, setWorkstyleVisibility, updateAccount } from "@/server/actions/candidate";
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
  dataRequests: DataRequest[];
  prefs: { digest: boolean; application_updates: boolean };
  initialTab?: string;
};

export function CandidateSettings({ candidate, email, fullName, locale, workstyleAttempt, dataRequests, prefs, initialTab }: Props) {
  const t = useTranslations("candidate.settings");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const account = useForm<AccountInput>({ resolver: zodResolver(accountSchema), defaultValues: { full_name: fullName, locale } });
  const password = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { password: "", confirm: "" } });
  const request = useForm<DataRequestInput>({ resolver: zodResolver(dataRequestSchema), defaultValues: { kind: "access", message: "" } });
  const prefsForm = useForm<{ digest: boolean; application_updates: boolean }>({ defaultValues: prefs });

  const notify = (ok: boolean, success: string) => toast({ title: ok ? success : tc("errors.generic"), variant: ok ? "success" : "danger" });

  return (
    <Tabs defaultValue={initialTab ?? "account"}>
      <TabsList>
        <TabsTrigger value="account">{t("tabs.account")}</TabsTrigger>
        <TabsTrigger value="privacy">{t("tabs.privacy")}</TabsTrigger>
        <TabsTrigger value="notifications">{t("tabs.notifications")}</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="grid max-w-lg gap-6">
        <form className="grid gap-4 rounded-[12px] border border-border bg-white p-6" noValidate onSubmit={account.handleSubmit((v) => start(async () => { const r = await updateAccount(v); notify(r.ok, t("account.saved")); router.refresh(); }))}>
          <FormField id="full_name" label={t("account.fullName")} error={account.formState.errors.full_name?.message}><Input id="full_name" {...account.register("full_name")} /></FormField>
          <FormField id="email" label={t("account.email")} hint={t("account.emailHint")}><Input id="email" value={email} readOnly disabled /></FormField>
          <FormField id="locale" label={t("account.locale")}><NativeSelect id="locale" options={[{ value: "en", label: tc("labels.english") }, { value: "es", label: tc("labels.spanish") }]} {...account.register("locale")} /></FormField>
          <Button type="submit" disabled={pending} className="justify-self-start">{tc("actions.save")}</Button>
        </form>
        <form className="grid gap-4 rounded-[12px] border border-border bg-white p-6" noValidate onSubmit={password.handleSubmit((v) => start(async () => { const r = await changePassword(v); notify(r.ok, t("account.passwordSaved")); password.reset(); }))}>
          <h3 className="text-sm font-semibold text-navy">{t("account.password")}</h3>
          <FormField id="new_password" label={t("account.newPassword")} error={password.formState.errors.password?.message}><Input id="new_password" type="password" autoComplete="new-password" {...password.register("password")} /></FormField>
          <FormField id="confirm_password" label={t("account.confirm")} error={password.formState.errors.confirm?.message}><Input id="confirm_password" type="password" autoComplete="new-password" {...password.register("confirm")} /></FormField>
          <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">{t("account.password")}</Button>
        </form>
      </TabsContent>

      <TabsContent value="privacy" className="grid max-w-2xl gap-6">
        <section className="rounded-[12px] border border-border bg-white p-6">
          <h3 className="text-sm font-semibold text-navy">{t("privacy.workstyleTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("privacy.workstyleBody")}</p>
          {workstyleAttempt ? (
            <div className="mt-4 flex items-center justify-between gap-4">
              <Label htmlFor="workstyle_visible" className="font-normal">{t("privacy.workstyleToggle")}</Label>
              <Switch id="workstyle_visible" defaultChecked={workstyleAttempt.visible_to_companies} onCheckedChange={(v) => start(async () => { const r = await setWorkstyleVisibility(workstyleAttempt.id, v); notify(r.ok, tc("actions.save")); })} />
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">{t("privacy.workstyleNone")}</p>}
        </section>
        <section className="rounded-[12px] border border-border bg-white p-6">
          <h3 className="text-sm font-semibold text-navy">{t("privacy.visibilityTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("privacy.visibilityBody")}</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <Label htmlFor="candidate_visible" className="font-normal">{t("privacy.visibilityToggle")}</Label>
            <Switch id="candidate_visible" defaultChecked={candidate.visibility === "visible_to_companies"} onCheckedChange={(v) => start(async () => { const r = await setCandidateVisibility(v ? "visible_to_companies" : "dexee_only"); notify(r.ok, tc("actions.save")); })} />
          </div>
        </section>
        <section className="rounded-[12px] border border-border bg-white p-6">
          <h3 className="text-sm font-semibold text-navy">{t("privacy.dataTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("privacy.dataBody")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("privacy.consent", { version: candidate.data_consent_version, date: format.dateTime(new Date(candidate.data_consent_at), "long") })}</p>
          <form className="mt-4 grid gap-4" noValidate onSubmit={request.handleSubmit((v) => start(async () => { const r = await createDataRequest(v); notify(r.ok, t("privacy.sent")); request.reset(); router.refresh(); }))}>
            <FormField id="kind" label={t("privacy.kind")}><NativeSelect id="kind" options={(["access", "correction", "deletion"] as const).map((k) => ({ value: k, label: te(`data_request_kind.${k}`) }))} {...request.register("kind")} /></FormField>
            <FormField id="message" label={t("privacy.message")} optional={tc("labels.optional")} error={request.formState.errors.message?.message}><Textarea id="message" rows={3} {...request.register("message")} /></FormField>
            <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">{t("privacy.submit")}</Button>
          </form>
          {dataRequests.length > 0 ? (
            <div className="mt-6">
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("privacy.history")}</h4>
              <ul className="mt-2 divide-y divide-border text-sm">
                {dataRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2"><span>{te(`data_request_kind.${r.kind as "access"}`)}</span><span className="text-xs text-muted-foreground">{r.status} · {format.dateTime(new Date(r.created_at), "short")}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </TabsContent>

      <TabsContent value="notifications">
        <form className="grid max-w-lg gap-4 rounded-[12px] border border-border bg-white p-6" onSubmit={prefsForm.handleSubmit((v) => start(async () => { const r = await updateNotificationPrefs(v); notify(r.ok, t("notifications.saved")); }))}>
          <h3 className="text-sm font-semibold text-navy">{t("notifications.title")}</h3>
          <Controller control={prefsForm.control} name="application_updates" render={({ field }) => (
            <div className="flex items-center justify-between gap-4"><Label htmlFor="application_updates" className="font-normal">{t("notifications.applicationUpdates")}</Label><Switch id="application_updates" checked={field.value} onCheckedChange={field.onChange} /></div>
          )} />
          <Controller control={prefsForm.control} name="digest" render={({ field }) => (
            <div className="flex items-center justify-between gap-4"><Label htmlFor="digest" className="font-normal">{t("notifications.assessmentResults")}</Label><Switch id="digest" checked={field.value} onCheckedChange={field.onChange} /></div>
          )} />
          <Button type="submit" disabled={pending} className="justify-self-start">{tc("actions.save")}</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
