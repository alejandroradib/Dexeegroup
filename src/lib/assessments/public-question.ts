import type { Database } from "@/types/database";

type QuestionRow = Database["public"]["Tables"]["assessment_questions"]["Row"];

/**
 * Question as served to the candidate. `answer_key` is the scoring key; `factor` is the
 * same information for the Likert instruments (which trait or style an item measures), so
 * it stays on the server too (audit C1). Scorers read the full row with the service role.
 */
export type PublicQuestion = Omit<QuestionRow, "answer_key" | "factor">;

export function toPublicQuestion(q: QuestionRow): PublicQuestion {
  const { answer_key: _key, factor: _factor, ...rest } = q;
  return rest;
}
