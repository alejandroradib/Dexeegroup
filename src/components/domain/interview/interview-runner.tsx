"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { CountdownTimer } from "@/components/domain/assessments/countdown-timer";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { INTERVIEW_MIN_WORDS, wordCount, type InterviewQuestion } from "@/lib/interview/questions";
import { saveInterviewAnswer, submitInterview } from "@/server/actions/interview";
import type { MockInterview } from "@/server/services/interviews";

export function InterviewRunner({ interview }: { interview: MockInterview }) {
  const t = useTranslations("interview.runner");
  const tr = useTranslations("assessments.runner");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const questions = (interview.questions as unknown as InterviewQuestion[]) ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>(
    (interview.answers as Record<string, string> | null) ?? {},
  );
  const [index, setIndex] = useState(() =>
    Math.min(
      questions.length - 1,
      questions.findIndex(
        (q) => !((interview.answers as Record<string, string> | null) ?? {})[q.id],
      ) === -1
        ? questions.length - 1
        : questions.findIndex(
            (q) => !((interview.answers as Record<string, string> | null) ?? {})[q.id],
          ),
    ),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef<string | null>(null);

  const flush = useCallback(async () => {
    const id = dirty.current;
    if (!id) return;
    dirty.current = null;
    setSaveState("saving");
    const result = await saveInterviewAnswer(interview.id, {
      question_id: id,
      text: answers[id] ?? "",
    });
    setSaveState(result.ok ? "saved" : "error");
  }, [answers, interview.id]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const question = questions[index];
  const text = question ? (answers[question.id] ?? "") : "";
  const words = wordCount(text);
  const answeredAll = questions.every((q) => (answers[q.id] ?? "").trim().length > 0);

  function onChange(value: string) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    dirty.current = question.id;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }

  async function move(next: number) {
    if (question && dirty.current) {
      dirty.current = null;
      setSaveState("saving");
      const result = await saveInterviewAnswer(interview.id, {
        question_id: question.id,
        text: answers[question.id] ?? "",
      });
      setSaveState(result.ok ? "saved" : "error");
    }
    setIndex(next);
  }

  function submit() {
    start(async () => {
      if (question)
        await saveInterviewAnswer(interview.id, {
          question_id: question.id,
          text: answers[question.id] ?? "",
        });
      const result = await submitInterview(interview.id);
      if (result.ok) {
        router.push(`/candidate/interview/${interview.id}/result`);
        router.refresh();
        return;
      }
      setError(result.error);
      if (result.error === "aiUnavailable" || result.error === "aiFailed") router.refresh();
      else toast({ title: tc("errors.generic"), variant: "danger" });
    });
  }

  if (!question) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-4">
        <ol className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => void move(i)}
                className={`rounded-full border px-3 py-1 text-xs ${i === index ? "border-navy bg-navy text-white" : (answers[q.id] ?? "").trim() ? "border-green bg-mint text-navy" : "border-border bg-white"}`}
                aria-current={i === index ? "step" : undefined}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <section className="border-border rounded-[12px] border bg-white p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              {t("question", { current: index + 1, total: questions.length })}
            </p>
            <Badge variant="secondary">{t(`focus.${question.focus}`)}</Badge>
          </div>
          <p className="text-navy mt-3 text-lg font-medium">{question.text}</p>
          <Label htmlFor="answer" className="sr-only">
            {t("question", { current: index + 1, total: questions.length })}
          </Label>
          <Textarea
            id="answer"
            rows={10}
            className="mt-4"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            maxLength={4000}
          />
          <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
            <span>
              {words < INTERVIEW_MIN_WORDS
                ? t("minWords", { count: INTERVIEW_MIN_WORDS })
                : t("words", { count: words })}
            </span>
            <span aria-live="polite">
              {saveState === "saving" ? t("saving") : saveState === "saved" ? t("saved") : ""}
            </span>
          </div>
        </section>
        {error === "incomplete" ? <Alert variant="warning">{t("incomplete")}</Alert> : null}
        {error === "aiUnavailable" ? <Alert variant="warning">{t("aiUnavailable")}</Alert> : null}
        {error === "aiFailed" ? <Alert variant="danger">{t("aiFailed")}</Alert> : null}
        {error === "interviewClosed" ? <Alert variant="danger">{t("closed")}</Alert> : null}
        <div className="flex items-center justify-between">
          <Button variant="ghost" disabled={index === 0} onClick={() => void move(index - 1)}>
            {tr("previous")}
          </Button>
          {index < questions.length - 1 ? (
            <Button onClick={() => void move(index + 1)}>{tr("next")}</Button>
          ) : (
            <ConfirmButton
              variant="accent"
              title={t("submit")}
              description={t("submitConfirm")}
              disabled={pending || !answeredAll}
              onConfirm={submit}
            >
              {pending ? t("submitting") : t("submit")}
            </ConfirmButton>
          )}
        </div>
      </div>
      <aside className="grid gap-3 self-start lg:sticky lg:top-24">
        <CountdownTimer expiresAt={interview.expires_at} label={tr("timeLeft")} />
        <p className="text-muted-foreground text-xs">
          {questions.filter((q) => (answers[q.id] ?? "").trim()).length}/{questions.length}
        </p>
      </aside>
    </div>
  );
}
