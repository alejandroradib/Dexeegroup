"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { startAttempt } from "@/server/actions/assessments";

export function StartAssessmentButton({ type, disabled }: { type: string; disabled?: boolean }) {
  const t = useTranslations("assessments.intro");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {error ? (
        <Alert variant={error.startsWith("cooldown:") ? "warning" : "danger"}>
          {error.startsWith("cooldown:")
            ? t("cooldown", { date: format.dateTime(new Date(error.slice(9)), "long") })
            : tc("errors.generic")}
        </Alert>
      ) : null}
      <Button
        variant="accent"
        size="lg"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await startAttempt(type);
            if (result.ok) {
              router.push(`/candidate/assessments/${type}/attempt/${result.data.attemptId}`);
              return;
            }
            if (result.error === "cooldown")
              setError(`cooldown:${result.details?.next_allowed_at?.[0] ?? ""}`);
            else setError(result.error);
          })
        }
      >
        {pending ? t("starting") : t("start")}
      </Button>
    </div>
  );
}
