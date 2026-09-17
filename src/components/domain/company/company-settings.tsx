"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  companyDetailsSchema,
  notificationPrefsSchema,
  teamInviteSchema,
  type CompanyDetailsInput,
  type TeamInviteInput,
} from "@/lib/validation/company";
import { COMPANY_SIZES, SECTORS } from "@/lib/validation/enums";
import {
  inviteTeamMember,
  removeTeamMember,
  setCompanyLogo,
  updateCompanyProfile,
  updateNotificationPrefs,
} from "@/server/actions/company";
import type { Company, CompanyMember } from "@/server/services/companies";

import { LogoUploader } from "./logo-uploader";

type Prefs = { digest: boolean; application_updates: boolean };
type Props = {
  company: Company;
  members: CompanyMember[];
  isOwner: boolean;
  currentUserId: string;
  prefs: Prefs;
  logoUrl: string | null;
  initialTab?: string;
};

export function CompanySettings({
  company,
  members,
  isOwner,
  currentUserId,
  prefs,
  logoUrl,
  initialTab,
}: Props) {
  const t = useTranslations("company.settings");
  const to = useTranslations("company.onboarding");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const profile = useForm<CompanyDetailsInput>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      name: company.name,
      legal_name: company.legal_name ?? "",
      website: company.website ?? "",
      sector: company.sector ?? undefined,
      country: company.country,
      state: company.state ?? "",
      city: company.city ?? "",
      size: company.size ?? undefined,
      description: company.description ?? "",
    },
  });
  const invite = useForm<TeamInviteInput>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: { email: "" },
  });
  const prefsForm = useForm<Prefs>({
    resolver: zodResolver(notificationPrefsSchema),
    defaultValues: prefs,
  });
  const [inviteError, setInviteError] = useState<string | null>(null);

  return (
    <Tabs defaultValue={initialTab ?? "company"}>
      <TabsList>
        <TabsTrigger value="company">{t("tabs.company")}</TabsTrigger>
        <TabsTrigger value="team">{t("tabs.team")}</TabsTrigger>
        <TabsTrigger value="notifications">{t("tabs.notifications")}</TabsTrigger>
      </TabsList>

      <TabsContent value="company">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <form
            onSubmit={profile.handleSubmit((values) =>
              start(async () => {
                const result = await updateCompanyProfile(values);
                toast({
                  title: result.ok ? t("companySaved") : tc("errors.generic"),
                  variant: result.ok ? "success" : "danger",
                });
                router.refresh();
              }),
            )}
            className="border-border grid gap-5 rounded-[12px] border bg-white p-6"
            noValidate
          >
            <FormField id="name" label={to("name")} error={profile.formState.errors.name?.message}>
              <Input id="name" {...profile.register("name")} />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="legal_name" label={to("legalName")} optional={tc("labels.optional")}>
                <Input id="legal_name" {...profile.register("legal_name")} />
              </FormField>
              <FormField
                id="website"
                label={to("website")}
                optional={tc("labels.optional")}
                error={profile.formState.errors.website?.message}
              >
                <Input id="website" type="url" {...profile.register("website")} />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="sector" label={to("sector")}>
                <NativeSelect
                  id="sector"
                  placeholder={to("select")}
                  options={SECTORS.map((v) => ({ value: v, label: te(`sector.${v}`) }))}
                  {...profile.register("sector", { setValueAs: (v) => v || undefined })}
                />
              </FormField>
              <FormField id="size" label={to("size")}>
                <NativeSelect
                  id="size"
                  placeholder={to("select")}
                  options={COMPANY_SIZES.map((v) => ({ value: v, label: te(`company_size.${v}`) }))}
                  {...profile.register("size", { setValueAs: (v) => v || undefined })}
                />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField
                id="country"
                label={to("country")}
                error={profile.formState.errors.country?.message}
              >
                <Input id="country" maxLength={2} {...profile.register("country")} />
              </FormField>
              <FormField id="state" label={to("state")} optional={tc("labels.optional")}>
                <Input id="state" {...profile.register("state")} />
              </FormField>
              <FormField id="city" label={to("city")} optional={tc("labels.optional")}>
                <Input id="city" {...profile.register("city")} />
              </FormField>
            </div>
            <FormField id="description" label={to("description")} optional={tc("labels.optional")}>
              <Textarea id="description" rows={4} {...profile.register("description")} />
            </FormField>
            <Button type="submit" disabled={pending} className="justify-self-start">
              {tc("actions.save")}
            </Button>
          </form>
          <div className="border-border rounded-[12px] border bg-white p-6">
            <h3 className="text-navy text-sm font-semibold">{to("logo")}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{to("logoHint")}</p>
            <div className="mt-4">
              <LogoUploader
                companyId={company.id}
                currentUrl={logoUrl}
                onUploaded={async (path) => {
                  const r = await setCompanyLogo(path);
                  if (r.ok) router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="team">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="border-border rounded-[12px] border bg-white">
            <h3 className="border-border text-navy border-b px-5 py-3 text-sm font-semibold">
              {t("team.title")}
            </h3>
            <ul>
              {members.map((m) => (
                <li
                  key={m.id}
                  className="border-border flex items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
                >
                  <div>
                    <p className="text-navy font-medium">
                      {m.profiles?.full_name ?? m.invited_email}
                      {m.user_id === currentUserId ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({t("team.you")})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {m.profiles?.email ?? m.invited_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                      {te(`member_role.${m.role}`)}
                    </Badge>
                    {!m.accepted_at ? <Badge variant="warning">{t("team.pending")}</Badge> : null}
                    {isOwner && m.role === "member" ? (
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        title={t("team.remove")}
                        description={t("team.removeConfirm")}
                        onConfirm={async () => {
                          await removeTeamMember(m.id);
                          router.refresh();
                        }}
                      >
                        {t("team.remove")}
                      </ConfirmButton>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-border rounded-[12px] border bg-white p-5">
            <h3 className="text-navy text-sm font-semibold">{t("team.invite")}</h3>
            {isOwner ? (
              <form
                className="mt-3 grid gap-3"
                noValidate
                onSubmit={invite.handleSubmit((values) =>
                  start(async () => {
                    setInviteError(null);
                    const result = await inviteTeamMember(values);
                    if (result.ok) {
                      toast({ title: t("team.invited"), variant: "success" });
                      invite.reset();
                      router.refresh();
                    } else setInviteError(result.error);
                  }),
                )}
              >
                <FormField
                  id="invite_email"
                  label={t("team.inviteEmail")}
                  error={invite.formState.errors.email?.message}
                >
                  <Input id="invite_email" type="email" {...invite.register("email")} />
                </FormField>
                {inviteError ? <Alert variant="danger">{tc("errors.generic")}</Alert> : null}
                <Button type="submit" disabled={pending}>
                  {t("team.invite")}
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground mt-2 text-sm">{t("team.ownerOnly")}</p>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="notifications">
        <form
          className="border-border grid max-w-lg gap-4 rounded-[12px] border bg-white p-6"
          onSubmit={prefsForm.handleSubmit((values) =>
            start(async () => {
              const result = await updateNotificationPrefs(values);
              toast({
                title: result.ok ? t("notifications.saved") : tc("errors.generic"),
                variant: result.ok ? "success" : "danger",
              });
            }),
          )}
        >
          <h3 className="text-navy text-sm font-semibold">{t("notifications.title")}</h3>
          <Controller
            control={prefsForm.control}
            name="digest"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="digest" className="font-normal">
                  {t("notifications.digest")}
                </Label>
                <Switch id="digest" checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
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
          <Button type="submit" disabled={pending} className="justify-self-start">
            {tc("actions.save")}
          </Button>
          <p className="text-muted-foreground text-xs">{format.dateTime(new Date(), "short")}</p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
