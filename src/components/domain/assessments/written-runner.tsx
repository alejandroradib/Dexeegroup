"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { submitAttempt } from "@/server/actions/assessments";
import type { AnswerRow, Attempt, PublicQuestion } from "@/server/services/assessments";

import { CountdownTimer } from "./countdown-timer";
import { useAttemptAnswers, type AnswerValue } from "./use-attempt-answers";

type Choice = { id: string; text: string };
type Passage = { id: string; title: string; text: string } | null;

type McqRow = { question: PublicQuestion; passage: Passage; showPassage: boolean };

/** Marks the first question of each passage so the passage renders once. */
function buildMcqRows(questions: PublicQuestion[]): McqRow[] {
  const rows: McqRow[] = [];
  let lastPassage: string | null = null;
  for (const q of questions) {
    if (q.question_type !== "mcq") continue;
    const passage = (q.options as { passage?: Passage } | null)?.passage ?? null;
    rows.push({ question: q, passage, showPassage: Boolean(passage && passage.id !== lastPassage) });
    if (passage) lastPassage = passage.id;
  }
  return rows;
}

function initialAnswers(answers: AnswerRow[]): Record<string, AnswerValue> {
  return Object.fromEntries(answers.map((a) => [a.question_id, { selected_option: a.selected_option, answer_text: a.answer_text, likert_value: a.likert_value }]));
}

export function WrittenRunner({ attempt, questions, answers: saved, resultHref }: { attempt: Attempt; questions: PublicQuestion[]; answers: AnswerRow[]; resultHref: string }) {
  const t = useTranslations("assessments.runner");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const { answers, setAnswer, flush, saveState } = useAttemptAnswers(attempt.id, initialAnswers(saved));
  const [expired, setExpired] = useState(() => (attempt.expires_at ? new Date(attempt.expires_at).getTime() <= Date.now() : false));
  const [pending, start] = useTransition();
  const onExpire = useCallback(() => setExpired(true), []);

  const mcq = useMemo(() => buildMcqRows(questions), [questions]);
  const writing = questions.find((q) => q.question_type === "writing");
  const unanswered = mcq.filter(({ question: q }) => !answers[q.id]?.selected_option).length;
  const writingText = writing ? answers[writing.id]?.answer_text ?? "" : "";
  const words = writingText.trim() ? writingText.trim().split(/\s+/).length : 0;
  const writingOpts = (writing?.options as { min_words?: number; max_words?: number } | null) ?? {};

  function submit() {
    start(async () => {
      await flush();
      const result = await submitAttempt(attempt.id);
      if (result.ok) {
        toast({ title: t("submitted"), variant: "success" });
        router.push(resultHref);
        router.refresh();
      } else toast({ title: result.error === "conflict" ? t("attemptClosed") : tc("errors.generic"), variant: "danger" });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-6">
        {expired ? <Alert variant="warning">{t("expired")}</Alert> : null}
        {saveState === "closed" ? <Alert variant="danger">{t("attemptClosed")}</Alert> : null}
        <ol className="grid gap-6">
          {mcq.map(({ question: q, passage, showPassage }, index) => {
            const choices = ((q.options as { choices?: Choice[] } | null)?.choices ?? []) as Choice[];
            return (
              <li key={q.id} className="grid gap-3">
                {showPassage && passage ? (
                  <article className="rounded-[12px] border border-border bg-mist/60 p-5">
                    <p className="text-xs font-semibold tracking-wide text-deep-green uppercase">{t("passage")}</p>
                    <h3 className="mt-1 text-base">{passage.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{passage.text}</p>
                  </article>
                ) : null}
                <fieldset className="rounded-[12px] border border-border bg-white p-5">
                  <legend className="sr-only">{t("question", { current: index + 1, total: mcq.length })}</legend>
                  <p className="text-xs text-muted-foreground">{t("question", { current: index + 1, total: mcq.length })} · {t(`section.${q.section as "grammar"}`)}</p>
                  <p className="mt-1 text-base font-medium text-navy">{q.prompt}</p>
                  <RadioGroup className="mt-3" value={answers[q.id]?.selected_option ?? ""} onValueChange={(v) => setAnswer(q.id, { selected_option: v })} disabled={saveState === "closed"}>
                    {choices.map((c) => (
                      <label key={c.id} htmlFor={`${q.id}-${c.id}`} className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border p-3 text-sm has-[[data-state=checked]]:border-navy has-[[data-state=checked]]:bg-mist">
                        <RadioGroupItem value={c.id} id={`${q.id}-${c.id}`} className="mt-0.5" />
                        <span>{c.text}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </li>
            );
          })}
        </ol>
        {writing ? (
          <section className="rounded-[12px] border border-border bg-white p-5">
            <p className="text-xs font-semibold tracking-wide text-deep-green uppercase">{t("writingTask")}</p>
            <p className="mt-2 text-base font-medium text-navy">{writing.prompt}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("wordTarget", { min: writingOpts.min_words ?? 150, max: writingOpts.max_words ?? 200 })}</p>
            <Label htmlFor="writing" className="sr-only">{t("writingTask")}</Label>
            <Textarea id="writing" rows={12} className="mt-3" value={writingText} onChange={(e) => setAnswer(writing.id, { answer_text: e.target.value })} disabled={expired || saveState === "closed"} maxLength={6000} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{t("wordCount", { count: words })}</p>
          </section>
        ) : null}
      </div>
      <aside className="grid gap-3 self-start lg:sticky lg:top-24">
        {attempt.expires_at ? <CountdownTimer expiresAt={attempt.expires_at} label={t("timeLeft")} onExpire={onExpire} /> : null}
        <div className="rounded-[12px] border border-border bg-white p-4 text-sm">
          <p className="font-medium text-navy">{t("unanswered", { count: unanswered })}</p>
          <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{saveState === "saving" ? t("saving") : saveState === "saved" ? t("saved") : ""}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("tabLeaveNotice")}</p>
          <ConfirmButton variant="accent" className="mt-4 w-full" title={t("submit")} description={t("submitConfirm")} onConfirm={submit} disabled={pending || saveState === "closed"}>
            {pending ? t("submitting") : t("submit")}
          </ConfirmButton>
        </div>
      </aside>
    </div>
  );
}
