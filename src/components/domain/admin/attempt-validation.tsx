"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { validateAttemptSchema, type ValidateAttemptInput } from "@/lib/validation/admin";
import { CEFR_LEVELS } from "@/lib/validation/enums";
import { getAudioPlaybackUrl } from "@/server/actions/assessments";
import {
  rejectAttempt,
  retryProcessing,
  validateAttempt,
} from "@/server/actions/assessments/admin";
import type { Database } from "@/types/database";

type Attempt = Database["public"]["Tables"]["assessment_attempts"]["Row"];

export function AudioPlayerButton({
  attemptId,
  questionId,
}: {
  attemptId: string;
  questionId: string;
}) {
  const t = useTranslations("assessments.admin");
  const [url, setUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (url) return <audio controls src={url} className="w-full" aria-label={t("audio")} />;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await getAudioPlaybackUrl(attemptId, questionId);
          if (r.ok) setUrl(r.data.url);
        })
      }
    >
      <PlayIcon /> {t("audio")}
    </Button>
  );
}

export function AttemptValidationForm({ attempt, isOral }: { attempt: Attempt; isOral: boolean }) {
  const t = useTranslations("assessments.admin");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [rejectComment, setRejectComment] = useState("");
  const form = useForm<ValidateAttemptInput>({
    resolver: zodResolver(validateAttemptSchema),
    defaultValues: {
      attempt_id: attempt.id,
      final_level: attempt.final_level ?? attempt.ai_level ?? undefined,
      comment: attempt.validation_comment ?? "",
    },
  });
  const e = form.formState.errors;
  const notify = (ok: boolean, msg: string) =>
    toast({ title: ok ? msg : tc("errors.generic"), variant: ok ? "success" : "danger" });
  const num = { setValueAs: (v: string) => (v === "" ? undefined : Number(v)) };

  return (
    <div className="grid gap-4">
      <form
        className="border-navy/30 bg-mist/60 grid gap-4 rounded-[12px] border p-5"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          start(async () => {
            const r = await validateAttempt(values);
            notify(r.ok, t("validated"));
            router.refresh();
          }),
        )}
      >
        <h2 className="text-base">{t("title")}</h2>
        <FormField id="final_level" label={t("finalLevel")} error={e.final_level?.message}>
          <NativeSelect
            id="final_level"
            placeholder={tc("labels.none")}
            options={CEFR_LEVELS.map((v) => ({ value: v, label: te(`cefr_level.${v}`) }))}
            {...form.register("final_level", { setValueAs: (v) => v || undefined })}
          />
        </FormField>
        {isOral ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="pronunciation"
              label={t("pronunciation")}
              error={e.pronunciation?.message}
            >
              <Input
                id="pronunciation"
                type="number"
                min={0}
                max={5}
                {...form.register("pronunciation", num)}
              />
            </FormField>
            <FormField
              id="intelligibility"
              label={t("intelligibility")}
              error={e.intelligibility?.message}
            >
              <Input
                id="intelligibility"
                type="number"
                min={0}
                max={5}
                {...form.register("intelligibility", num)}
              />
            </FormField>
          </div>
        ) : null}
        <FormField
          id="comment"
          label={t("comment")}
          optional={tc("labels.optional")}
          error={e.comment?.message}
        >
          <Textarea id="comment" rows={3} {...form.register("comment")} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="accent" disabled={pending}>
            {t("validate")}
          </Button>
          {attempt.status === "failed" || attempt.status === "processing" ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await retryProcessing(attempt.id);
                  notify(r.ok, t("retried"));
                  router.refresh();
                })
              }
            >
              {t("retry")}
            </Button>
          ) : null}
        </div>
      </form>
      <div className="border-border grid gap-2 rounded-[12px] border bg-white p-5">
        <p className="text-navy text-sm font-semibold">{t("reject")}</p>
        <p className="text-muted-foreground text-xs">{t("rejectBody")}</p>
        <Textarea
          rows={2}
          value={rejectComment}
          onChange={(ev) => setRejectComment(ev.target.value)}
          aria-label={t("comment")}
        />
        <ConfirmButton
          variant="destructive"
          size="sm"
          className="justify-self-start"
          title={t("reject")}
          description={t("rejectBody")}
          disabled={rejectComment.trim().length < 3}
          onConfirm={async () => {
            const r = await rejectAttempt({ attempt_id: attempt.id, comment: rejectComment });
            notify(r.ok, t("rejected"));
            router.refresh();
          }}
        >
          {t("reject")}
        </ConfirmButton>
      </div>
    </div>
  );
}
