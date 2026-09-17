import { describe, expect, it } from "vitest";

import { answerTotal, oralLevel, wordsPerMinute } from "@/lib/assessments/english-oral";

describe("english oral", () => {
  it("computes words per minute", () => {
    expect(wordsPerMinute("one two three four five six", 30)).toBe(12);
    expect(wordsPerMinute("", 60)).toBe(0);
    expect(wordsPerMinute("a b", 0)).toBe(0);
  });
  it("averages per-answer totals and maps to a level", () => {
    const answers = [
      { fluency: 4, coherence: 4, lexical_range: 3, grammatical_accuracy: 3, total: 14 },
      { fluency: 4, coherence: 3, lexical_range: 3, grammatical_accuracy: 3, total: 13 },
    ];
    const result = oralLevel(answers);
    expect(result.average).toBe(13.5);
    expect(result.level).toBe("C1");
    expect(answerTotal(answers[0]!)).toBe(14);
  });
  it("returns A1 with no answers", () => {
    expect(oralLevel([]).level).toBe("A1");
  });
});
