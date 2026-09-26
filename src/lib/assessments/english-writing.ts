import { levelFromRubricTotal, type Cefr, type LevelRanges } from "./cefr";

export type WritingCriteria = {
  task_achievement: number;
  coherence: number;
  lexical_range: number;
  grammatical_accuracy: number;
};

/** Below this total an "A1: unintelligible" call from the model is accepted; above it, the rubric decides. */
export const WRITING_A1_MAX_TOTAL = 2;

export function writingTotal(criteria: WritingCriteria): number {
  return (
    criteria.task_achievement +
    criteria.coherence +
    criteria.lexical_range +
    criteria.grammatical_accuracy
  );
}

/**
 * Level from the recomputed total. The rubric reserves A1 for unintelligible text, which the
 * model signals with its own level; it is honoured only when the criteria agree.
 */
export function writingLevelFromTotal(
  total: number,
  modelLevel?: string | null,
  ranges?: LevelRanges,
): Cefr {
  if (modelLevel === "A1" && total <= WRITING_A1_MAX_TOTAL) return "A1";
  return levelFromRubricTotal(total, ranges);
}

/**
 * Cleans a model grade before it is stored: total and level come from the four criteria, not
 * from the model's own arithmetic (audit I11). Everything else passes through.
 */
export function normalizeWritingGrade<T extends WritingCriteria & { total: number; level: string }>(
  grade: T,
  ranges?: LevelRanges,
): T & { total: number; level: Cefr } {
  const total = writingTotal(grade);
  return { ...grade, total, level: writingLevelFromTotal(total, grade.level, ranges) };
}
