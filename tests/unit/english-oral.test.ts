import { describe, expect, it } from "vitest";

import {
  answerTotal,
  normalizeOralGrade,
  oralLevel,
  wordsPerMinute,
} from "@/lib/assessments/english-oral";

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

  // Audit I11: the model's own totals and question ids are not trusted.
  it("ignores a reported total and recomputes from the sub-scores", () => {
    const inflated = [
      { fluency: 2, coherence: 2, lexical_range: 2, grammatical_accuracy: 2, total: 20 },
      { fluency: 2, coherence: 2, lexical_range: 2, grammatical_accuracy: 2, total: 20 },
    ];
    const result = oralLevel(inflated);
    expect(result.average).toBe(8);
    expect(result.level).toBe("B1");
  });

  it("drops answers for questions that were not sent, and duplicates", () => {
    const grade = {
      answers: [
        {
          question_id: "q1",
          fluency: 4,
          coherence: 4,
          lexical_range: 4,
          grammatical_accuracy: 4,
          total: 0,
          comment: "",
        },
        {
          question_id: "q1",
          fluency: 5,
          coherence: 5,
          lexical_range: 5,
          grammatical_accuracy: 5,
          total: 20,
          comment: "",
        },
        {
          question_id: "ghost",
          fluency: 5,
          coherence: 5,
          lexical_range: 5,
          grammatical_accuracy: 5,
          total: 20,
          comment: "",
        },
        {
          question_id: "q2",
          fluency: 3,
          coherence: 3,
          lexical_range: 3,
          grammatical_accuracy: 3,
          total: 0,
          comment: "",
        },
      ],
      average: 20,
      level: "C2",
      feedback: ["a", "b", "c"],
    };
    const normalized = normalizeOralGrade(grade, ["q1", "q2"]);
    expect(normalized.answers.map((a) => [a.question_id, a.total])).toEqual([
      ["q1", 16],
      ["q2", 12],
    ]);
    expect(normalized.dropped).toEqual(["q1", "ghost"]);
    expect(normalized.average).toBe(14);
    expect(normalized.level).toBe("C1");
  });
});
