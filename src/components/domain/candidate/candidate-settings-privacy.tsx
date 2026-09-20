"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { dataRequestSchema, type DataRequestInput } from "@/lib/validation/candidate";
import {
  createDataRequest,
  setCandidateVisibility,
  setWorkstyleVisibility,
  updateConsentFlags,
} from "@/server/actions/candidate";
import type { Candidate } from "@/server/services/candidates";
import type { Database } from "@/types/database";

type DataRequest = Database["public"]["Tables"]["data_requests"]["Row"];

export function CandidateSettingsPrivacy({
  candidate,
  workstyleAttempt,
  discAttempt,
  dataRequests,
}: {
  candidate: Candidate;
  workstyleAttempt: { id: string; visible_to_companies: boolean } | null;
  discAttempt: { id: string; visible_to_companies: boolean } | null;
  dataRequests: DataRequest[];
}) {
  const t = useTranslations("candidate.settings");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const rawFlags = (candidate.consent_flags ?? {}) as Record<string, unknown>;
  const consentFlags = {
    job_contact: rawFlags.job_contact === true,
    analytics: rawFlags.analytics === true,
  };
  const request = useForm<DataRequestInput>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: { kind: "access", message: "" },
  });
  const notify = (ok: boolean, success: string) =>
    toast({ title: ok ? success : tc("errors.generic"), variant: ok ? "success" : "danger" });

  return (
    <TabsContent value="privacy" className="grid max-w-2xl gap-6">
      <section className="border-border rounded-[12px] border bg-white p-6">
        <h3 className="text-navy text-sm font-semibold">{t("privacy.workstyleTitle")}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{t("privacy.workstyleBody")}</p>
        {workstyleAttempt ? (
          <div className="mt-4 flex items-center justify-between gap-4">
            <Label htmlFor="workstyle_visible" className="font-normal">
              {t("privacy.workstyleToggle")}
            </Label>
            <Switch
              id="workstyle_visible"
              defaultChecked={workstyleAttempt.visible_to_companies}
              onCheckedChange={(v) =>
                start(async () => {
                  const r = await setWorkstyleVisibility(workstyleAttempt.id, v);
                  notify(r.ok, tc("actions.save"));
                })
              }
            />
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">{t("privacy.workstyleNone")}</p>
        )}
        {discAttempt ? (
          <div className="mt-4 flex items-center justify-between gap-4">
            <Label htmlFor="disc_visible" className="font-normal">
              {t("privacy.discToggle")}
            </Label>
            <Switch
              id="disc_visible"
              defaultChecked={discAttempt.visible_to_companies}
              onCheckedChange={(v) =>
                start(async () => {
                  const r = await setWorkstyleVisibility(discAttempt.id, v);
                  notify(r.ok, tc("actions.save"));
                })
              }
            />
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">{t("privacy.discNone")}</p>
        )}
      </section>
      <section className="border-border rounded-[12px] border bg-white p-6">
        <h3 className="text-navy text-sm font-semibold">{t("privacy.visibilityTitle")}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{t("privacy.visibilityBody")}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <Label htmlFor="candidate_visible" className="font-normal">
            {t("privacy.visibilityToggle")}
          </Label>
          <Switch
            id="candidate_visible"
            defaultChecked={candidate.visibility === "visible_to_companies"}
            onCheckedChange={(v) =>
              start(async () => {
                const r = await setCandidateVisibility(v ? "visible_to_companies" : "dexee_only");
                notify(r.ok, tc("actions.save"));
              })
            }
          />
        </div>
      </section>
      <section className="border-border rounded-[12px] border bg-white p-6">
        <h3 className="text-navy text-sm font-semibold">{t("privacy.consentsTitle")}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{t("privacy.consentsBody")}</p>
        <div className="mt-4 grid gap-3">
          {(["job_contact", "analytics"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={`consent_${key}`} className="font-normal">
                {t(key === "job_contact" ? "privacy.jobContact" : "privacy.analytics")}
              </Label>
              <Switch
                id={`consent_${key}`}
                defaultChecked={consentFlags[key]}
                onCheckedChange={(v) =>
                  start(async () => {
                    const r = await updateConsentFlags({ ...consentFlags, [key]: v });
                    notify(r.ok, t("privacy.consentsSaved"));
                    router.refresh();
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>
      <section className="border-border rounded-[12px] border bg-white p-6">
        <h3 className="text-navy text-sm font-semibold">{t("privacy.dataTitle")}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{t("privacy.dataBody")}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          {t("privacy.consent", {
            version: candidate.data_consent_version,
            date: format.dateTime(new Date(candidate.data_consent_at), "long"),
          })}
        </p>
        <form
          className="mt-4 grid gap-4"
          noValidate
          onSubmit={request.handleSubmit((v) =>
            start(async () => {
              const r = await createDataRequest(v);
              notify(r.ok, t("privacy.sent"));
              request.reset();
              router.refresh();
            }),
          )}
        >
          <FormField id="kind" label={t("privacy.kind")}>
            <NativeSelect
              id="kind"
              options={(["access", "correction", "deletion"] as const).map((k) => ({
                value: k,
                label: te(`data_request_kind.${k}`),
              }))}
              {...request.register("kind")}
            />
          </FormField>
          <FormField
            id="message"
            label={t("privacy.message")}
            optional={tc("labels.optional")}
            error={request.formState.errors.message?.message}
          >
            <Textarea id="message" rows={3} {...request.register("message")} />
          </FormField>
          <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
            {t("privacy.submit")}
          </Button>
        </form>
        {dataRequests.length > 0 ? (
          <div className="mt-6">
            <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t("privacy.history")}
            </h4>
            <ul className="divide-border mt-2 divide-y text-sm">
              {dataRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span>{te(`data_request_kind.${r.kind as "access"}`)}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.status} · {format.dateTime(new Date(r.created_at), "short")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </TabsContent>
  );
}
