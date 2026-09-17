import { describe, expect, it } from "vitest";

import {
  combineWrittenLevels,
  DEFAULT_THRESHOLDS,
  drawItems,
  mcqLevel,
  scoreMcq,
  writingLevel,
  type Band,
  type McqItem,
} from "@/lib/assessments/english-written";

function bank(counts: Record<Band, number>): McqItem[] {
  const items: McqItem[] = [];
  for (const band of ["band1", "band2", "band3"] as Band[]) {
    for (let i = 0; i < counts[band]; i += 1)
      items.push({ id: `${band}-${i}`, band, correct: "a" });
  }
  return items;
}

describe("mcqLevel thresholds", () => {
  const base = { overall: 1, band1: 1, band2: 1, band3: 1 };
  it("A1 when overall below 20%", () => {
    expect(mcqLevel({ ...base, overall: 0.19 })).toBe("A1");
    expect(mcqLevel({ overall: 0.2, band1: 0.5, band2: 0, band3: 0 })).toBe("A2");
  });
  it("A2 when band1 below 70%", () => {
    expect(mcqLevel({ overall: 0.5, band1: 0.69, band2: 1, band3: 1 })).toBe("A2");
    expect(mcqLevel({ overall: 0.5, band1: 0.7, band2: 0.54, band3: 0 })).toBe("B1");
  });
  it("B1 when band2 below 55%", () => {
    expect(mcqLevel({ overall: 0.6, band1: 0.8, band2: 0.54, band3: 0.9 })).toBe("B1");
    expect(mcqLevel({ overall: 0.6, band1: 0.8, band2: 0.55, band3: 0.49 })).toBe("B2");
  });
  it("B2 when band3 below 50% or overall below 75%", () => {
    expect(mcqLevel({ overall: 0.9, band1: 1, band2: 1, band3: 0.49 })).toBe("B2");
    expect(mcqLevel({ overall: 0.74, band1: 0.8, band2: 0.8, band3: 0.6 })).toBe("B2");
  });
  it("C1 at band3 ≥ 50% and overall ≥ 75%", () => {
    expect(mcqLevel({ overall: 0.75, band1: 0.9, band2: 0.8, band3: 0.5 })).toBe("C1");
    expect(mcqLevel({ overall: 0.89, band1: 1, band2: 1, band3: 0.85 })).toBe("C1");
    expect(mcqLevel({ overall: 0.95, band1: 1, band2: 1, band3: 0.79 })).toBe("C1");
  });
  it("C2 at band3 ≥ 80% and overall ≥ 90%", () => {
    expect(mcqLevel({ overall: 0.9, band1: 1, band2: 1, band3: 0.8 })).toBe("C2");
  });
  it("honors custom thresholds from config", () => {
    expect(
      mcqLevel(
        { overall: 0.9, band1: 1, band2: 1, band3: 0.8 },
        { ...DEFAULT_THRESHOLDS, c2_overall_min: 0.95 },
      ),
    ).toBe("C1");
  });
});

describe("scoreMcq", () => {
  it("computes per-band accuracy and overall", () => {
    const items = bank({ band1: 14, band2: 14, band3: 12 });
    const answers = items.map((i, idx) => ({
      question_id: i.id,
      selected_option: idx % 2 === 0 ? "a" : "b",
    }));
    const score = scoreMcq(items, answers);
    expect(score.total).toBe(40);
    expect(score.correct).toBe(20);
    expect(score.bands.band1.total).toBe(14);
    expect(score.overall).toBeCloseTo(0.5);
  });
  it("treats missing answers as incorrect", () => {
    const items = bank({ band1: 2, band2: 0, band3: 0 });
    expect(scoreMcq(items, []).correct).toBe(0);
  });
});

describe("writingLevel", () => {
  it("maps the 0-20 total to CEFR at every boundary", () => {
    expect(writingLevel(0)).toBe("A2");
    expect(writingLevel(5)).toBe("A2");
    expect(writingLevel(6)).toBe("B1");
    expect(writingLevel(9)).toBe("B1");
    expect(writingLevel(10)).toBe("B2");
    expect(writingLevel(13)).toBe("B2");
    expect(writingLevel(14)).toBe("C1");
    expect(writingLevel(17)).toBe("C1");
    expect(writingLevel(18)).toBe("C2");
    expect(writingLevel(20)).toBe("C2");
  });
});

describe("combineWrittenLevels", () => {
  const grade = (
    level: "A2" | "B1" | "B2" | "C1" | "C2",
    flags = { off_topic: false, too_short: false },
  ) => ({
    task_achievement: 3,
    coherence: 3,
    lexical_range: 3,
    grammatical_accuracy: 3,
    total: 12,
    level,
    feedback: [],
    flags,
  });
  it("takes the lower level and validates automatically when levels are close", () => {
    const result = combineWrittenLevels("C1", grade("B2"));
    expect(result.finalLevel).toBe("B2");
    expect(result.status).toBe("validated");
  });
  it("sends a two-level gap to validation", () => {
    const result = combineWrittenLevels("C1", grade("B1"));
    expect(result.finalLevel).toBe("B1");
    expect(result.status).toBe("pending_validation");
    expect(result.reasons).toContain("level_gap");
  });
  it("sends flagged writing to validation", () => {
    expect(
      combineWrittenLevels("B2", grade("B2", { off_topic: true, too_short: false })).status,
    ).toBe("pending_validation");
    expect(
      combineWrittenLevels("B2", grade("B2", { off_topic: false, too_short: true })).status,
    ).toBe("pending_validation");
  });
  it("uses the MCQ level alone when writing is excluded", () => {
    const result = combineWrittenLevels("B2", null);
    expect(result).toEqual({
      finalLevel: "B2",
      status: "validated",
      reasons: ["writing_excluded"],
    });
  });
});

describe("drawItems", () => {
  it("respects quotas and is deterministic per seed", () => {
    const items = bank({ band1: 22, band2: 22, band3: 22 });
    const quotas = { band1: 14, band2: 14, band3: 12 } as const;
    const a = drawItems(items, quotas, "attempt-1");
    const b = drawItems(items, quotas, "attempt-1");
    const c = drawItems(items, quotas, "attempt-2");
    expect(a).toHaveLength(40);
    expect(a.filter((i) => i.band === "band3")).toHaveLength(12);
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(a.map((i) => i.id)).not.toEqual(c.map((i) => i.id));
  });
});
