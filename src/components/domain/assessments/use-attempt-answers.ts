"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { recordTabLeave, saveAssessmentAnswers } from "@/server/actions/assessments";

export type AnswerValue = {
  selected_option?: string | null;
  answer_text?: string | null;
  likert_value?: number | null;
};

/** Local answer state with debounced autosave and tab-visibility logging. */
export function useAttemptAnswers(attemptId: string, initial: Record<string, AnswerValue>) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "closed" | "error">(
    "idle",
  );
  const dirty = useRef(new Map<string, AnswerValue>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (dirty.current.size === 0) return;
    const batch = [...dirty.current.entries()].map(([question_id, value]) => ({
      question_id,
      ...value,
    }));
    dirty.current.clear();
    setSaveState("saving");
    const result = await saveAssessmentAnswers(attemptId, batch);
    if (result.ok) setSaveState("saved");
    else setSaveState(result.error === "attemptClosed" ? "closed" : "error");
  }, [attemptId]);

  const setAnswer = useCallback(
    (questionId: string, value: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...value } }));
      dirty.current.set(questionId, { ...dirty.current.get(questionId), ...value });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flush();
        void recordTabLeave(attemptId);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [attemptId, flush]);

  return { answers, setAnswer, flush, saveState };
}
