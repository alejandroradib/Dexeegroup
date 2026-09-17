export const FACTORS = ["extraversion", "agreeableness", "conscientiousness", "emotional_stability", "intellect"] as const;
export type Factor = (typeof FACTORS)[number];
export type Band = "low" | "mid" | "high";

export type LikertItem = { id: string; factor: Factor; reverse: boolean };
export type LikertAnswer = { question_id: string; likert_value: number | null };
export type SjtItem = { id: string; best: string };
export type SjtAnswer = { question_id: string; selected_option: string | null };

export type FactorScore = { raw: number; scaled: number; band: Band; answered: number };
export type WorkstyleScores = { factors: Record<Factor, FactorScore>; sjt: { score: number; total: number; band: Band } };

export type BandThresholds = { low_below: number; high_above: number };
export const DEFAULT_BANDS: BandThresholds = { low_below: 40, high_above: 60 };

export function bandFor(scaled: number, t: BandThresholds = DEFAULT_BANDS): Band {
  if (scaled < t.low_below) return "low";
  if (scaled > t.high_above) return "high";
  return "mid";
}

/** raw = sum of item values with reversed items as 6 − value (range 10–50); scaled = (raw − 10) / 40 × 100. */
export function scoreFactors(items: LikertItem[], answers: LikertAnswer[], bands: BandThresholds = DEFAULT_BANDS): Record<Factor, FactorScore> {
  const byId = new Map(answers.map((a) => [a.question_id, a.likert_value]));
  const result = {} as Record<Factor, FactorScore>;
  for (const factor of FACTORS) {
    const factorItems = items.filter((i) => i.factor === factor);
    let raw = 0;
    let answered = 0;
    for (const item of factorItems) {
      const value = byId.get(item.id);
      if (value === null || value === undefined) continue;
      const clamped = Math.min(5, Math.max(1, value));
      raw += item.reverse ? 6 - clamped : clamped;
      answered += 1;
    }
    // Unanswered items count as neutral (3) so partial attempts still score in range.
    raw += (factorItems.length - answered) * 3;
    const count = factorItems.length || 10;
    const min = count;
    const max = count * 5;
    const scaled = Math.round(((raw - min) / (max - min)) * 1000) / 10;
    result[factor] = { raw, scaled, band: bandFor(scaled, bands), answered };
  }
  return result;
}

export function scoreSjt(items: SjtItem[], answers: SjtAnswer[]): { score: number; total: number; band: Band } {
  const byId = new Map(answers.map((a) => [a.question_id, a.selected_option]));
  const score = items.filter((i) => byId.get(i.id) === i.best).length;
  const ratio = items.length > 0 ? score / items.length : 0;
  return { score, total: items.length, band: ratio >= 0.7 ? "high" : ratio >= 0.4 ? "mid" : "low" };
}

export function scoreWorkstyle(likertItems: LikertItem[], likertAnswers: LikertAnswer[], sjtItems: SjtItem[], sjtAnswers: SjtAnswer[], bands?: BandThresholds): WorkstyleScores {
  return { factors: scoreFactors(likertItems, likertAnswers, bands), sjt: scoreSjt(sjtItems, sjtAnswers) };
}

export type WorkstyleReport = {
  version: 1;
  factors: Record<Factor, { scaled: number; band: Band; label: { en: string; es: string }; preferences: { en: string; es: string }; environments: { en: string; es: string } }>;
  sjt: { score: number; total: number; band: Band; summary: { en: string; es: string } };
  strengths: { en: string[]; es: string[] };
  disclaimer: { en: string; es: string };
};

type Copy = {
  labels: Record<Factor, string>;
  factors: Record<Factor, Record<Band, { preferences: string; environments: string }>>;
  sjt: Record<Band, string>;
  strengths: Record<Factor, string>;
  sjtStrength: string;
  disclaimer: string;
};

/**
 * Deterministic report: same scores → same report. Strengths are the two highest factors plus the SJT
 * strength when the SJT score reaches the configured minimum (SPEC 11.3).
 */
export function buildWorkstyleReport(scores: WorkstyleScores, copy: { en: Copy; es: Copy }, strengthSjtMin = 7): WorkstyleReport {
  const ranked = [...FACTORS].sort((a, b) => scores.factors[b].scaled - scores.factors[a].scaled || FACTORS.indexOf(a) - FACTORS.indexOf(b));
  const top = ranked.slice(0, 2);
  const strengths = {
    en: [...top.map((f) => copy.en.strengths[f]), ...(scores.sjt.score >= strengthSjtMin ? [copy.en.sjtStrength] : [])],
    es: [...top.map((f) => copy.es.strengths[f]), ...(scores.sjt.score >= strengthSjtMin ? [copy.es.sjtStrength] : [])],
  };
  const factors = {} as WorkstyleReport["factors"];
  for (const factor of FACTORS) {
    const { scaled, band } = scores.factors[factor];
    factors[factor] = {
      scaled,
      band,
      label: { en: copy.en.labels[factor], es: copy.es.labels[factor] },
      preferences: { en: copy.en.factors[factor][band].preferences, es: copy.es.factors[factor][band].preferences },
      environments: { en: copy.en.factors[factor][band].environments, es: copy.es.factors[factor][band].environments },
    };
  }
  return {
    version: 1,
    factors,
    sjt: { ...scores.sjt, summary: { en: copy.en.sjt[scores.sjt.band], es: copy.es.sjt[scores.sjt.band] } },
    strengths,
    disclaimer: { en: copy.en.disclaimer, es: copy.es.disclaimer },
  };
}
