import { levelFromRubricTotal, type Cefr, type LevelRanges } from "./cefr";

export type OralAnswerScores = {
  fluency: number;
  coherence: number;
  lexical_range: number;
  grammatical_accuracy: number;
};

export type OralAnswerGrade = OralAnswerScores & { total: number };

export function wordsPerMinute(transcript: string, durationSeconds: number): number {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (durationSeconds <= 0) return 0;
  return Math.round((words / durationSeconds) * 60);
}

export function answerTotal(g: OralAnswerScores): number {
  return g.fluency + g.coherence + g.lexical_range + g.grammatical_accuracy;
}

/**
 * Overall oral level: the 0-20 mapping applied to the average of the per-answer totals. The
 * totals are recomputed from the four sub-scores here; a `total` the model reports is never
 * trusted (audit I11).
 */
export function oralLevel(
  answers: OralAnswerScores[],
  ranges?: LevelRanges,
): { average: number; level: Cefr } {
  if (answers.length === 0) return { average: 0, level: "A1" };
  const average = answers.reduce((s, a) => s + answerTotal(a), 0) / answers.length;
  return { average: Math.round(average * 100) / 100, level: levelFromRubricTotal(average, ranges) };
}

export type NormalizedOralGrade<A extends OralAnswerScores & { question_id: string }> = {
  answers: (A & { total: number })[];
  average: number;
  level: Cefr;
  feedback: string[];
  /** Question ids the model returned that were not sent, or were sent twice. */
  dropped: string[];
};

/**
 * Cleans a model grade before it is stored: only the questions that were actually sent count,
 * once each; totals, average and level are derived from the sub-scores.
 */
export function normalizeOralGrade<A extends OralAnswerScores & { question_id: string }>(
  grade: { answers: A[]; feedback: string[] },
  knownQuestionIds: readonly string[],
  ranges?: LevelRanges,
): NormalizedOralGrade<A> {
  const known = new Set(knownQuestionIds);
  const seen = new Set<string>();
  const answers: (A & { total: number })[] = [];
  const dropped: string[] = [];
  for (const answer of grade.answers) {
    if (!known.has(answer.question_id) || seen.has(answer.question_id)) {
      dropped.push(answer.question_id);
      continue;
    }
    seen.add(answer.question_id);
    answers.push({ ...answer, total: answerTotal(answer) });
  }
  const { average, level } = oralLevel(answers, ranges);
  return { answers, average, level, feedback: grade.feedback, dropped };
}

/** Reviewer override: pronunciation and intelligibility (0-5) are averaged into the final decision when provided. */
export function finalOralLevel(aiLevel: Cefr, override?: Cefr | null): Cefr {
  return override ?? aiLevel;
}
