import { z } from "zod";

import { cefrIndex, type Cefr } from "@/lib/assessments/cefr";

/**
 * Conversational practice interview (DECISIONS 92). Pure helpers shared by the server
 * action, the chat component and the tests; nothing here touches the database or the model.
 */

export type InterviewLanguage = "en" | "es";

export const turnSchema = z.object({
  role: z.enum(["interviewer", "candidate"]),
  text: z.string().min(1).max(4000),
  at: z.string(),
});
export const transcriptSchema = z.array(turnSchema);
export type InterviewTurn = z.infer<typeof turnSchema>;

/** Most candidate replies in one interview. The interviewer is told to close before this. */
export const INTERVIEW_MAX_CANDIDATE_TURNS = 10;
/** The candidate may end the interview and ask for feedback from this many replies. */
export const INTERVIEW_MIN_CANDIDATE_TURNS = 4;
/** Longest single reply, in characters. Spoken answers of 60 to 90 seconds are far shorter. */
export const INTERVIEW_MESSAGE_MAX_CHARS = 2000;
/** Replies per candidate per hour, across interviews. Caps model spend from one account. */
export const INTERVIEW_RATE_LIMIT = { limit: 40, windowSeconds: 3600 } as const;

/**
 * The interview runs in the language the job will be conducted in. Jobs carry no language
 * field, so the English requirement decides: B1 or above means the company interviews in
 * English; no requirement, A1 or A2 means Spanish. Recorded as an assumption in DECISIONS 92.
 */
export function interviewLanguageForJob(job: {
  english_level_required: Cefr | null | undefined;
}): InterviewLanguage {
  const level = job.english_level_required;
  if (!level) return "es";
  return cefrIndex(level) >= cefrIndex("B1") ? "en" : "es";
}

export function candidateTurns(transcript: InterviewTurn[]): number {
  return transcript.filter((t) => t.role === "candidate").length;
}

export function canFinish(transcript: InterviewTurn[]): boolean {
  return candidateTurns(transcript) >= INTERVIEW_MIN_CANDIDATE_TURNS;
}

export function turnsRemaining(transcript: InterviewTurn[]): number {
  return Math.max(0, INTERVIEW_MAX_CANDIDATE_TURNS - candidateTurns(transcript));
}

/** True when the last turn is the interviewer's, so the candidate is expected to reply. */
export function awaitingCandidate(transcript: InterviewTurn[]): boolean {
  const last = transcript[transcript.length - 1];
  return last?.role === "interviewer";
}

export function parseTranscript(value: unknown): InterviewTurn[] {
  const parsed = transcriptSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
