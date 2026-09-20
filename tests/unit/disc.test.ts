import { describe, expect, it } from "vitest";

import { scoreDisc, scoreStyles, STYLES, type DiscItem } from "@/lib/assessments/disc";
import { discReport } from "@/lib/assessments/disc-report";

/** Seven items per style, two of them reverse-keyed, mirroring supabase/seed/disc.json. */
const items: DiscItem[] = STYLES.flatMap((style) =>
  Array.from({ length: 7 }, (_, i) => ({ id: `${style}-${i}`, style, reverse: i >= 5 })),
);

const answerAll = (value: number) => items.map((i) => ({ question_id: i.id, likert_value: value }));

describe("DISC scoring", () => {
  it("scores reverse-keyed items as 6 − value", () => {
    const scores = scoreStyles(items, answerAll(5));
    // 5 straight × 5 + 2 reversed × 1 = 27 raw → (27 − 7) / 28 = 71
    expect(scores.D.raw).toBe(27);
    expect(scores.D.scaled).toBe(71);
    expect(scores.D.band).toBe("high");
  });

  it("scales the 7–35 range to 0–100", () => {
    const min = scoreStyles(
      items,
      items.map((i) => ({ question_id: i.id, likert_value: i.reverse ? 5 : 1 })),
    );
    const max = scoreStyles(
      items,
      items.map((i) => ({ question_id: i.id, likert_value: i.reverse ? 1 : 5 })),
    );
    expect(min.S.scaled).toBe(0);
    expect(max.S.scaled).toBe(100);
    expect(min.S.band).toBe("low");
    expect(max.S.band).toBe("high");
  });

  it("treats an unanswered item as the midpoint, never as an extreme", () => {
    const partial = items
      .filter((i) => i.style === "C" && i.id !== "C-0")
      .map((i) => ({ question_id: i.id, likert_value: i.reverse ? 1 : 5 }));
    const scores = scoreStyles(items, partial);
    expect(scores.C.answered).toBe(6);
    // Six items at the maximum plus one at 3: raw 33 → (33 − 7) / 28 = 93
    expect(scores.C.raw).toBe(33);
    expect(scores.C.scaled).toBe(93);
  });

  it("names the primary style and a secondary within fifteen points", () => {
    const answers = items.map((i) => {
      const high = i.style === "D" ? 5 : i.style === "I" ? 4 : 2;
      return { question_id: i.id, likert_value: i.reverse ? 6 - high : high };
    });
    const scores = scoreDisc(items, answers);
    expect(scores.primary).toBe("D");
    expect(scores.styles.D.scaled).toBe(100);
    expect(scores.styles.I.scaled).toBe(75);
    // Twenty-five points apart: I is not a secondary.
    expect(scores.secondary).toBeNull();
  });

  it("keeps a close runner-up as the secondary style", () => {
    const answers = items.map((i) => {
      const high = i.style === "S" ? 5 : i.style === "C" ? 5 : 2;
      return { question_id: i.id, likert_value: i.reverse ? 6 - high : high };
    });
    const scores = scoreDisc(items, answers);
    // S and C tie at 100; ties resolve in D, I, S, C order.
    expect(scores.primary).toBe("S");
    expect(scores.secondary).toBe("C");
  });

  it("is deterministic and resolves a four-way tie to D", () => {
    const a = scoreDisc(items, answerAll(3));
    const b = scoreDisc(items, answerAll(3));
    expect(a).toEqual(b);
    expect(a.primary).toBe("D");
    expect(a.secondary).toBe("I");
  });
});

describe("DISC report", () => {
  it("carries bilingual descriptors for every style and a headline naming the profile", () => {
    const scores = scoreDisc(
      items,
      items.map((i) => {
        const high = i.style === "C" ? 5 : 2;
        return { question_id: i.id, likert_value: i.reverse ? 6 - high : high };
      }),
    );
    const report = discReport(scores);
    expect(report.version).toBe(1);
    expect(report.primary).toBe("C");
    expect(report.headline.en).toBe("Conscientiousness");
    expect(report.headline.es).toBe("Cumplimiento");
    for (const style of STYLES) {
      expect(report.styles[style].label.en).not.toBe("");
      expect(report.styles[style].preferences.es).not.toBe("");
      expect(report.styles[style].environments.en).not.toBe("");
    }
    expect(report.strengths.en).toHaveLength(1);
  });

  it("names both styles in the headline when there is a secondary", () => {
    const report = discReport(scoreDisc(items, answerAll(3)));
    expect(report.headline.en).toBe("Dominance with Influence");
    expect(report.headline.es).toBe("Dominancia con Influencia");
    expect(report.strengths.es).toHaveLength(2);
  });

  it("never claims to be a certified instrument", () => {
    const report = discReport(scoreDisc(items, answerAll(4)));
    expect(report.disclaimer.en).toMatch(/not a certified DiSC/);
    expect(report.disclaimer.en).toMatch(/does not rank candidates/);
    expect(report.disclaimer.es).toMatch(/No es una evaluación DiSC/);
  });
});
