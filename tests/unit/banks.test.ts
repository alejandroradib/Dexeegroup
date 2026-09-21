import { describe, expect, it } from "vitest";

import { loadBanks, resolveBanksDir } from "../../scripts/lib/banks";

// CI has no real banks: they hold the answer keys and live outside the repository (audit E1).
// These assertions check the structural contract against the fixtures. The stronger
// rotation minimums are checked below, and only when a real bank directory is configured.
const banks = loadBanks(resolveBanksDir({ allowFixtures: true }));

describe("question banks", () => {
  it("has at least 60 MCQ items with band quotas and a writing bank of at least 6 prompts", () => {
    const mcq = banks.english_written.filter((q) => q.question_type === "mcq");
    const writing = banks.english_written.filter((q) => q.question_type === "writing");
    expect(mcq.length).toBeGreaterThanOrEqual(60);
    expect(writing.length).toBeGreaterThanOrEqual(6);
    for (const band of ["band1", "band2", "band3"]) {
      expect(
        mcq.filter((q) => (q.options as { band: string }).band === band).length,
      ).toBeGreaterThanOrEqual(12);
    }
    for (const q of mcq) {
      const choices = (q.options as { choices: { id: string }[] }).choices;
      expect(choices).toHaveLength(4);
      expect(choices.map((c) => c.id)).toContain((q.answer_key as { correct: string }).correct);
    }
  });
  it("has at least 8 oral prompts across four categories", () => {
    expect(banks.english_oral.length).toBeGreaterThanOrEqual(8);
    expect(new Set(banks.english_oral.map((q) => q.section)).size).toBeGreaterThanOrEqual(4);
  });
  it("has 50 IPIP items (10 per factor) and 10 SJT items", () => {
    const likert = banks.psychometric.filter((q) => q.question_type === "likert");
    const sjt = banks.psychometric.filter((q) => q.question_type === "situational");
    expect(likert).toHaveLength(50);
    expect(sjt.length).toBeGreaterThanOrEqual(10);
    for (const factor of [
      "extraversion",
      "agreeableness",
      "conscientiousness",
      "emotional_stability",
      "intellect",
    ]) {
      expect(likert.filter((q) => q.factor === factor)).toHaveLength(10);
    }
    expect(likert.some((q) => (q.answer_key as { reverse: boolean }).reverse)).toBe(true);
    for (const q of sjt) {
      const choices = (q.options as { choices: { id: string }[] }).choices;
      expect(choices).toHaveLength(4);
      expect(choices.map((c) => c.id)).toContain((q.answer_key as { best: string }).best);
    }
  });
  it("uses unique bank ids", () => {
    const ids = [...banks.english_written, ...banks.english_oral, ...banks.psychometric].map(
      (q) => q.bank_id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/**
 * Audit E2: the rotated banks are larger than the SPEC minimum so that two candidates share
 * few items and memorising the whole set is impractical. Skipped unless the real banks are
 * available, which is never the case in CI.
 */
const real = process.env.ASSESSMENT_BANKS_DIR?.trim();
describe.skipIf(!real)("rotated bank size", () => {
  const rotated = real ? loadBanks(resolveBanksDir()) : banks;
  it("draws 40 written items from at least 120, with at least 12 writing prompts", () => {
    const mcq = rotated.english_written.filter((q) => q.question_type === "mcq");
    const writing = rotated.english_written.filter((q) => q.question_type === "writing");
    expect(mcq.length).toBeGreaterThanOrEqual(120);
    expect(writing.length).toBeGreaterThanOrEqual(12);
    for (const band of ["band1", "band2", "band3"]) {
      expect(
        mcq.filter((q) => (q.options as { band: string }).band === band).length,
      ).toBeGreaterThanOrEqual(36);
    }
  });
  it("draws 4 oral prompts from at least 40", () => {
    expect(rotated.english_oral.length).toBeGreaterThanOrEqual(40);
  });
  it("draws 10 situational items from at least 30", () => {
    expect(
      rotated.psychometric.filter((q) => q.question_type === "situational").length,
    ).toBeGreaterThanOrEqual(30);
  });
  it("keeps seven DISC items per style", () => {
    for (const style of ["D", "I", "S", "C"]) {
      expect(rotated.disc.filter((q) => q.factor === style)).toHaveLength(7);
    }
  });
});
