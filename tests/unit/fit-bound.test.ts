import { describe, expect, it } from "vitest";

import { boundFitScore, FIT_ADJUSTMENT_MAX, fitBaseScore } from "@/lib/fit/bound-score";

/** Audit I11: the stored fit score follows the sub-scores; the model may adjust it by ten at most. */
describe("fit score bounds", () => {
  const evidence = { experience_match: 4, skills_match: 3, english_match: 5, seniority_match: 4 };

  it("derives the base score as the sum of the four sub-scores times five", () => {
    expect(fitBaseScore(evidence)).toBe(80);
    expect(
      fitBaseScore({ experience_match: 0, skills_match: 0, english_match: 0, seniority_match: 0 }),
    ).toBe(0);
    expect(
      fitBaseScore({ experience_match: 5, skills_match: 5, english_match: 5, seniority_match: 5 }),
    ).toBe(100);
  });

  it("keeps a model score within the allowed adjustment", () => {
    expect(boundFitScore(evidence, 85)).toEqual({ score: 85, base: 80, drift: 5 });
    expect(boundFitScore(evidence, 99)).toEqual({
      score: 80 + FIT_ADJUSTMENT_MAX,
      base: 80,
      drift: 19,
    });
    expect(boundFitScore(evidence, 12)).toEqual({
      score: 80 - FIT_ADJUSTMENT_MAX,
      base: 80,
      drift: 68,
    });
  });

  it("stays inside 0 to 100 at the edges", () => {
    const top = { experience_match: 5, skills_match: 5, english_match: 5, seniority_match: 5 };
    expect(boundFitScore(top, 100).score).toBe(100);
    const bottom = { experience_match: 0, skills_match: 0, english_match: 0, seniority_match: 0 };
    expect(boundFitScore(bottom, 40).score).toBe(FIT_ADJUSTMENT_MAX);
    expect(boundFitScore(bottom, -5).score).toBe(0);
  });
});
