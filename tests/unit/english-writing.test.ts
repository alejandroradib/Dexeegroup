import { describe, expect, it } from "vitest";

import {
  normalizeWritingGrade,
  writingLevelFromTotal,
  writingTotal,
} from "@/lib/assessments/english-writing";

const grade = (overrides: Partial<Record<string, unknown>> = {}) => ({
  task_achievement: 3,
  coherence: 3,
  lexical_range: 3,
  grammatical_accuracy: 3,
  total: 20,
  level: "C2",
  feedback: ["a", "b", "c"],
  flags: { off_topic: false, too_short: false },
  ...overrides,
});

/** Audit I11: total and level come from the criteria, not from the model's arithmetic. */
describe("writing grade normalisation", () => {
  it("recomputes the total and derives the level from it", () => {
    const normalized = normalizeWritingGrade(grade());
    expect(writingTotal(grade())).toBe(12);
    expect(normalized.total).toBe(12);
    expect(normalized.level).toBe("B2");
    expect(normalized.feedback).toEqual(["a", "b", "c"]);
  });

  it("maps totals onto the rubric bands", () => {
    expect(writingLevelFromTotal(5)).toBe("A2");
    expect(writingLevelFromTotal(6)).toBe("B1");
    expect(writingLevelFromTotal(13)).toBe("B2");
    expect(writingLevelFromTotal(14)).toBe("C1");
    expect(writingLevelFromTotal(18)).toBe("C2");
  });

  it("honours an A1 call only when the criteria agree that the text is unintelligible", () => {
    expect(writingLevelFromTotal(1, "A1")).toBe("A1");
    expect(writingLevelFromTotal(4, "A1")).toBe("A2");
    const strong = normalizeWritingGrade(
      grade({
        task_achievement: 5,
        coherence: 5,
        lexical_range: 4,
        grammatical_accuracy: 4,
        level: "A1",
      }),
    );
    expect(strong.level).toBe("C2");
  });
});
