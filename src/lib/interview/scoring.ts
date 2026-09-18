import type { InterviewReport } from "@/lib/ai/prompts/mock-interview";

export type InterviewBand = "developing" | "solid" | "strong";

/** Overall 0-20 to a friendly band shown to the candidate and used by Dexee for filtering. */
export function interviewBand(overall: number): InterviewBand {
  if (overall >= 15) return "strong";
  if (overall >= 9) return "solid";
  return "developing";
}

export function overallFromScores(scores: InterviewReport["scores"]): number {
  return (
    scores.communication + scores.clarity_of_achievements + scores.structure + scores.relevance
  );
}

/** Guards against a model returning an overall that disagrees with the four scores. */
export function normalizeReport(report: InterviewReport): InterviewReport {
  return { ...report, overall: overallFromScores(report.scores) };
}
