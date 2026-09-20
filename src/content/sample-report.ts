/**
 * The illustrative Dexee Verified report shown on `/sample-report` (PHASES-GTM 9.2).
 *
 * This is a worked example, not a real candidate: Dexee has not yet run a candidate
 * through the platform whose report it could anonymize and publish. The page says so
 * plainly, for the same reason the metrics in `proof.ts` are empty.
 *
 * The structure mirrors what the product actually produces: the four rubric dimensions in
 * `src/lib/assessments/english-oral.ts`, the CEFR scale in `cefr.ts` and the five IPIP
 * factors in `workstyle.ts`. When Phase 10.4 renders this page from real seed data with
 * the product's own renderer, delete this file rather than letting the two drift.
 */

import type { Cefr } from "@/lib/assessments/cefr";
import type { Factor } from "@/lib/assessments/workstyle";

export type SampleCheck = {
  /** Message key suffix under `marketing.sampleReport.checks.*`. */
  id: "identity" | "writtenEnglish" | "spokenEnglish" | "workProfile";
  /** Headline result, already formatted. Levels render as a CEFR badge. */
  result: string;
  /** Score out of `outOf`, when the check produces one. */
  score?: number;
  outOf?: number;
  /** Who decided: the model pre-scores, a person signs off where it says so. */
  decidedBy: "reviewer" | "system";
};

export const SAMPLE_CANDIDATE = {
  /** Anonymized label. A real report carries the candidate's name once contact is released. */
  reference: "DX-4821",
  roleFamily: "customer_support",
  seniority: "mid",
  /** Years of relevant experience, as stated by the candidate and checked against references. */
  yearsExperience: 5,
  /** ISO date the report was issued. */
  issuedAt: "2026-09-12",
} as const;

export const SAMPLE_CHECKS: readonly SampleCheck[] = [
  { id: "identity", result: "verified", decidedBy: "reviewer" },
  { id: "writtenEnglish", result: "B2", score: 42, outOf: 50, decidedBy: "system" },
  { id: "spokenEnglish", result: "B2", score: 15.5, outOf: 20, decidedBy: "reviewer" },
  { id: "workProfile", result: "shared", decidedBy: "system" },
] as const;

/** The four dimensions the oral rubric scores, each out of five. */
export const SAMPLE_ORAL_RUBRIC: readonly { id: string; score: number }[] = [
  { id: "fluency", score: 4 },
  { id: "coherence", score: 4 },
  { id: "lexical_range", score: 4 },
  { id: "grammatical_accuracy", score: 3.5 },
] as const;

/** AI pre-score against the reviewer's final call. They agree here; the reviewer decides. */
export const SAMPLE_ORAL_DECISION = {
  aiLevel: "B2" as Cefr,
  reviewerLevel: "B2" as Cefr,
  /** Message key suffix under `marketing.sampleReport.reviewerNotes.*`. */
  reviewerNoteId: "confirmed",
} as const;

/** Scaled 0-100 per IPIP factor, as `workstyle.ts` computes them. */
export const SAMPLE_WORKSTYLE: readonly { factor: Factor; scaled: number }[] = [
  { factor: "conscientiousness", scaled: 78 },
  { factor: "agreeableness", scaled: 71 },
  { factor: "emotional_stability", scaled: 66 },
  { factor: "extraversion", scaled: 52 },
  { factor: "intellect", scaled: 58 },
] as const;

/** Fields a Dexee report never carries, whatever a client asks for. */
export const SAMPLE_EXCLUDED_FIELDS = [
  "photo",
  "dateOfBirth",
  "maritalStatus",
  "religion",
  "politicalViews",
] as const;

/**
 * The fit analysis block. Score and evidence dimensions only; the prose lives in
 * `marketing.sampleReport.fit*` so both languages read naturally.
 */
export const SAMPLE_FIT = {
  score: 82,
  evidence: { experience_match: 4, skills_match: 4, english_match: 5, seniority_match: 3 },
} as const;
