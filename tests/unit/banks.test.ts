import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBanks } from "../../scripts/lib/banks";

const banks = loadBanks(path.resolve(process.cwd(), "supabase/seed"));

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
    expect(sjt).toHaveLength(10);
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
