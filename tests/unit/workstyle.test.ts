import { describe, expect, it } from "vitest";

import { bandFor, FACTORS, scoreFactors, scoreSjt, scoreWorkstyle, type LikertItem } from "@/lib/assessments/workstyle";
import { workstyleReport } from "@/lib/assessments/workstyle-report";

const items: LikertItem[] = FACTORS.flatMap((factor) => Array.from({ length: 10 }, (_, i) => ({ id: `${factor}-${i}`, factor, reverse: i % 2 === 1 })));

describe("workstyle scoring", () => {
  it("scores reverse-keyed items as 6 − value", () => {
    const answers = items.map((i) => ({ question_id: i.id, likert_value: 5 }));
    const scores = scoreFactors(items, answers);
    // 5 straight items × 5 + 5 reversed × 1 = 30 raw → (30 − 10) / 40 = 50
    expect(scores.extraversion.raw).toBe(30);
    expect(scores.extraversion.scaled).toBe(50);
    expect(scores.extraversion.band).toBe("mid");
  });
  it("scales 10–50 to 0–100", () => {
    const min = scoreFactors(items, items.map((i) => ({ question_id: i.id, likert_value: i.reverse ? 5 : 1 })));
    const max = scoreFactors(items, items.map((i) => ({ question_id: i.id, likert_value: i.reverse ? 1 : 5 })));
    expect(min.intellect.scaled).toBe(0);
    expect(max.intellect.scaled).toBe(100);
    expect(min.intellect.band).toBe("low");
    expect(max.intellect.band).toBe("high");
  });
  it("assigns bands at the thresholds", () => {
    expect(bandFor(39.9)).toBe("low");
    expect(bandFor(40)).toBe("mid");
    expect(bandFor(60)).toBe("mid");
    expect(bandFor(60.1)).toBe("high");
  });
  it("scores the SJT 0–10", () => {
    const sjt = Array.from({ length: 10 }, (_, i) => ({ id: `sjt-${i}`, best: "c" }));
    const answers = sjt.map((s, i) => ({ question_id: s.id, selected_option: i < 7 ? "c" : "a" }));
    expect(scoreSjt(sjt, answers)).toEqual({ score: 7, total: 10, band: "high" });
  });
  it("builds a deterministic report and picks strengths from the two highest factors", () => {
    const answers = items.map((i) => ({ question_id: i.id, likert_value: i.factor === "conscientiousness" || i.factor === "intellect" ? (i.reverse ? 1 : 5) : 3 }));
    const sjt = Array.from({ length: 10 }, (_, i) => ({ id: `sjt-${i}`, best: "b" }));
    const scores = scoreWorkstyle(items, answers, sjt, sjt.map((s) => ({ question_id: s.id, selected_option: "b" })));
    const a = workstyleReport(scores);
    const b = workstyleReport(scores);
    expect(a).toEqual(b);
    expect(a.strengths.en).toHaveLength(3);
    expect(a.strengths.es).toHaveLength(3);
    expect(a.factors.conscientiousness.band).toBe("high");
    expect(a.factors.extraversion.band).toBe("mid");
    expect(a.sjt.summary.en).toContain("consistently");
  });
  it("omits the SJT strength below the minimum", () => {
    const answers = items.map((i) => ({ question_id: i.id, likert_value: 3 }));
    const sjt = Array.from({ length: 10 }, (_, i) => ({ id: `sjt-${i}`, best: "b" }));
    const scores = scoreWorkstyle(items, answers, sjt, sjt.map((s, i) => ({ question_id: s.id, selected_option: i < 6 ? "b" : "a" })));
    expect(workstyleReport(scores).strengths.en).toHaveLength(2);
  });
});
