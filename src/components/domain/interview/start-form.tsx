"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { ROLE_FAMILIES } from "@/lib/validation/enums";
import { startInterview } from "@/server/actions/interview";
import type { Database } from "@/types/database";

type RoleFamily = Database["public"]["Enums"]["role_family"];

export function InterviewStartForm({
  defaultRoleFamily,
}: {
  defaultRoleFamily: RoleFamily | null;
}) {
  const t = useTranslations("interview.intro");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const [roleFamily, setRoleFamily] = useState<RoleFamily>(defaultRoleFamily ?? "other");
  const [language, setLanguage] = useState<"en" | "es">(locale === "es" ? "es" : "en");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const result = await startInterview({ role_family: roleFamily, language });
          if (result.ok) router.push(`/candidate/interview/${result.data.id}`);
          else if (result.error === "cooldown")
            setError(`cooldown:${result.details?.next_allowed_at?.[0] ?? ""}`);
          else setError(result.error);
        });
      }}
    >
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
      {error ? (
        <Alert variant={error.startsWith("cooldown:") ? "warning" : "danger"}>
          {error.startsWith("cooldown:")
            ? t("cooldown", { date: format.dateTime(new Date(error.slice(9)), "long") })
            : tc("errors.generic")}
        </Alert>
      ) : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending}>
        {pending ? t("starting") : t("start")}
      </Button>
    </form>
  );
}
