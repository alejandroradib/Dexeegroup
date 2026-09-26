/**
 * Fit score bounds (audit I11). The prompt asks the model for four sub-scores (0-5 each) and a
 * 0-100 score that may deviate from their sum × 5 by at most ten points. The stored score is
 * derived here, so a model that ignores its own rule cannot rank an applicant far from the
 * evidence it reported.
 */

export const FIT_ADJUSTMENT_MAX = 10;

export type FitEvidence = {
  experience_match: number;
  skills_match: number;
  english_match: number;
  seniority_match: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function fitBaseScore(evidence: FitEvidence): number {
  const sum =
    evidence.experience_match +
    evidence.skills_match +
    evidence.english_match +
    evidence.seniority_match;
  return clamp(Math.round(sum * 5), 0, 100);
}

export function boundFitScore(
  evidence: FitEvidence,
  modelScore: number,
): { score: number; base: number; drift: number } {
  const base = fitBaseScore(evidence);
  const rounded = Math.round(modelScore);
  const drift = Math.abs(rounded - base);
  const score = clamp(clamp(rounded, base - FIT_ADJUSTMENT_MAX, base + FIT_ADJUSTMENT_MAX), 0, 100);
  return { score, base, drift };
}
