import { describe, expect, it } from "vitest";

import { buildInterviewQuestions, wordCount } from "@/lib/interview/questions";
import { interviewBand, normalizeReport } from "@/lib/interview/scoring";

describe("mock interview", () => {
  it("builds six questions mixing generic and role-specific ones in both languages", () => {
    const en = buildInterviewQuestions("finance_accounting", "en");
    const es = buildInterviewQuestions("finance_accounting", "es");
    expect(en).toHaveLength(6);
    expect(en.filter((q) => q.focus === "role")).toHaveLength(2);
    expect(new Set(en.map((q) => q.id)).size).toBe(6);
    expect(es[0]?.text).not.toBe(en[0]?.text);
  });
  it("maps overall scores to bands", () => {
    expect(interviewBand(8)).toBe("developing");
    expect(interviewBand(9)).toBe("solid");
    expect(interviewBand(15)).toBe("strong");
  });
  it("recomputes overall from the four scores", () => {
    const report = normalizeReport({ scores: { communication: 4, clarity_of_achievements: 3, structure: 4, relevance: 5 }, overall: 3, strengths: ["a"], improvements: ["b"], per_question: [], summary: "x".repeat(20) });
    expect(report.overall).toBe(16);
  });
  it("counts words", () => {
    expect(wordCount("  one two   three ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });
});
