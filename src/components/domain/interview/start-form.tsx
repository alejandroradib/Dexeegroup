"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { interviewLanguageForJob } from "@/lib/interview/conversation";
import { ROLE_FAMILIES } from "@/lib/validation/enums";
import { startInterview } from "@/server/actions/interview";
import type { InterviewJobOption } from "@/server/services/interviews";
import type { Database } from "@/types/database";

type RoleFamily = Database["public"]["Enums"]["role_family"];
const GENERAL = "general";

/**
 * Picks what to rehearse for: one of the candidate's jobs (language follows the job) or a
 * general interview by role family with a language of their choosing.
 */
export function InterviewStartForm({
  defaultRoleFamily,
  jobs,
  preselectedJobId,
}: {
  defaultRoleFamily: RoleFamily | null;
  jobs: InterviewJobOption[];
  preselectedJobId: string | null;
}) {
  const t = useTranslations("interview.intro");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const [jobId, setJobId] = useState<string>(
    preselectedJobId && jobs.some((j) => j.id === preselectedJobId)
      ? preselectedJobId
      : (jobs[0]?.id ?? GENERAL),
  );
  const [roleFamily, setRoleFamily] = useState<RoleFamily>(defaultRoleFamily ?? "other");
  const [language, setLanguage] = useState<"en" | "es">(locale === "es" ? "es" : "en");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const job = jobs.find((j) => j.id === jobId) ?? null;
  const jobLanguage = job ? interviewLanguageForJob(job) : null;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const result = await startInterview(
            job ? { job_id: job.id } : { role_family: roleFamily, language },
          );
          if (result.ok) router.push(`/candidate/interview/${result.data.id}`);
          else if (result.error === "cooldown")
            setError(`cooldown:${result.details?.next_allowed_at?.[0] ?? ""}`);
          else setError(result.error);
        });
      }}
    >
      <FormField id="interview_job" label={t("job")} hint={t("jobHint")}>
        <NativeSelect
          id="interview_job"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          options={[
            ...jobs.map((j) => ({
              value: j.id,
              label: j.company_name ? `${j.title} · ${j.company_name}` : j.title,
            })),
            { value: GENERAL, label: t("generalOption") },
          ]}
        />
      </FormField>
      {job ? (
        <p className="text-muted-foreground text-sm">
          {t(jobLanguage === "en" ? "jobLanguageEn" : "jobLanguageEs")}
        </p>
      ) : (
        <>
          <FormField id="role_family" label={t("roleFamily")}>
            <NativeSelect
              id="role_family"
              value={roleFamily}
              onChange={(e) => setRoleFamily(e.target.value as RoleFamily)}
              options={ROLE_FAMILIES.map((v) => ({ value: v, label: te(`role_family.${v}`) }))}
            />
          </FormField>
          <FormField id="language" label={t("language")}>
            <NativeSelect
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "es")}
              options={[
                { value: "es", label: tc("labels.spanish") },
                { value: "en", label: tc("labels.english") },
              ]}
            />
          </FormField>
        </>
      )}
      {error ? (
        <Alert variant={error.startsWith("cooldown:") ? "warning" : "danger"}>
          {error.startsWith("cooldown:")
            ? t("cooldown", { date: format.dateTime(new Date(error.slice(9)), "long") })
            : error === "aiUnavailable"
              ? t("aiUnavailable")
              : tc("errors.generic")}
        </Alert>
      ) : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending}>
        {pending ? t("starting") : t("start")}
      </Button>
    </form>
  );
}
