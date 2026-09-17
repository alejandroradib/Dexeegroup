"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { submitAttempt } from "@/server/actions/assessments";
import type { AnswerRow, Attempt, PublicQuestion } from "@/server/services/assessments";

import { useAttemptAnswers, type AnswerValue } from "./use-attempt-answers";

const PAGE = 10;

export function WorkstyleRunner({ attempt, questions, answers: saved, resultHref }: { attempt: Attempt; questions: PublicQuestion[]; answers: AnswerRow[]; resultHref: string }) {
  const t = useTranslations("assessments.runner");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const initial = useMemo(() => Object.fromEntries(saved.map((a) => [a.question_id, { selected_option: a.selected_option, likert_value: a.likert_value } as AnswerValue])), [saved]);
  const { answers, setAnswer, flush, saveState } = useAttemptAnswers(attempt.id, initial);
  const [page, setPage] = useState(0);
  const [pending, start] = useTransition();

  const likert = questions.filter((q) => q.question_type === "likert");
  const sjt = questions.filter((q) => q.question_type === "situational");
  const pages = [...Array.from({ length: Math.ceil(likert.length / PAGE) }, (_, i) => likert.slice(i * PAGE, (i + 1) * PAGE)), sjt];
  const current = pages[page] ?? [];
  const answered = questions.filter((q) => answers[q.id]?.likert_value || answers[q.id]?.selected_option).length;
  const unanswered = questions.length - answered;
  const scaleLabels = ((likert[0]?.options as { scale?: { labels_en: string[]; labels_es: string[] } } | null)?.scale ?? null);
  const labels = scaleLabels ? (locale === "es" ? scaleLabels.labels_es : scaleLabels.labels_en) : ["1", "2", "3", "4", "5"];

  function submit() {
    start(async () => {
      await flush();
      const result = await submitAttempt(attempt.id);
      if (result.ok) { toast({ title: t("submitted"), variant: "success" }); router.push(resultHref); router.refresh(); }
      else toast({ title: tc("errors.generic"), variant: "danger" });
    });
  }

  return (
    <div className="grid gap-6">
      <Progress value={(answered / Math.max(1, questions.length)) * 100} aria-label={t("unanswered", { count: unanswered })} />
      {saveState === "closed" ? <Alert variant="danger">{t("attemptClosed")}</Alert> : null}
      <p className="text-sm font-medium text-navy">{page < pages.length - 1 ? t("likertScale") : t("sjtIntro")} <span className="text-muted-foreground">({page + 1}/{pages.length})</span></p>
      <ol className="grid gap-4">
        {current.map((q) => {
          const isLikert = q.question_type === "likert";
          const prompt = locale === "es" ? ((q.options as { text_es?: string; prompt_es?: string } | null)?.text_es ?? (q.options as { prompt_es?: string } | null)?.prompt_es ?? q.prompt) : q.prompt;
          if (isLikert) {
            return (
              <li key={q.id} className="rounded-[12px] border border-border bg-white p-4">
                <fieldset>
                  <legend className="text-sm font-medium text-navy">{prompt}</legend>
                  <div className="mt-3 grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} type="button" onClick={() => setAnswer(q.id, { likert_value: v })} aria-pressed={answers[q.id]?.likert_value === v} aria-label={labels[v - 1]}
                        className={cn("rounded-[8px] border px-1 py-2 text-xs sm:text-[11px]", answers[q.id]?.likert_value === v ? "border-navy bg-navy text-white" : "border-border bg-white text-muted-foreground hover:bg-mist")}>
                        <span className="block font-semibold">{v}</span>
                        <span className="hidden sm:block">{labels[v - 1]}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </li>
            );
          }
          const choices = ((q.options as { choices?: { id: string; text: string; text_es?: string }[] } | null)?.choices ?? []);
          return (
            <li key={q.id} className="rounded-[12px] border border-border bg-white p-4">
              <fieldset>
                <legend className="text-sm font-medium text-navy">{prompt}</legend>
                <RadioGroup className="mt-3" value={answers[q.id]?.selected_option ?? ""} onValueChange={(v) => setAnswer(q.id, { selected_option: v })}>
                  {choices.map((c) => (
                    <label key={c.id} htmlFor={`${q.id}-${c.id}`} className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border p-3 text-sm has-[[data-state=checked]]:border-navy has-[[data-state=checked]]:bg-mist">
                      <RadioGroupItem value={c.id} id={`${q.id}-${c.id}`} className="mt-0.5" />
                      <span>{locale === "es" ? c.text_es ?? c.text : c.text}</span>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={page === 0} onClick={() => { void flush(); setPage((p) => p - 1); window.scrollTo({ top: 0 }); }}>{t("previous")}</Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">{saveState === "saving" ? t("saving") : saveState === "saved" ? t("saved") : t("unanswered", { count: unanswered })}</p>
        {page < pages.length - 1 ? (
          <Button onClick={() => { void flush(); setPage((p) => p + 1); window.scrollTo({ top: 0 }); }}>{t("next")}</Button>
        ) : (
          <ConfirmButton variant="accent" title={t("submit")} description={t("submitConfirm")} onConfirm={submit} disabled={pending || unanswered > 0 || saveState === "closed"}>
            {pending ? t("submitting") : t("submit")}
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
