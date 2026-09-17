import { levelFromRubricTotal, type Cefr, type LevelRanges } from "./cefr";

export type OralAnswerGrade = { fluency: number; coherence: number; lexical_range: number; grammatical_accuracy: number; total: number };

export function wordsPerMinute(transcript: string, durationSeconds: number): number {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (durationSeconds <= 0) return 0;
  return Math.round((words / durationSeconds) * 60);
}

export function answerTotal(g: Omit<OralAnswerGrade, "total">): number {
  return g.fluency + g.coherence + g.lexical_range + g.grammatical_accuracy;
}

/** Overall oral level: the 0-20 mapping applied to the average of the per-answer totals. */
export function oralLevel(answers: OralAnswerGrade[], ranges?: LevelRanges): { average: number; level: Cefr } {
  if (answers.length === 0) return { average: 0, level: "A1" };
  const average = answers.reduce((s, a) => s + a.total, 0) / answers.length;
  return { average: Math.round(average * 100) / 100, level: levelFromRubricTotal(average, ranges) };
}

/** Reviewer override: pronunciation and intelligibility (0-5) are averaged into the final decision when provided. */
export function finalOralLevel(aiLevel: Cefr, override?: Cefr | null): Cefr {
  return override ?? aiLevel;
}
