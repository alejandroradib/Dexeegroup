import { cefrGap, levelFromRubricTotal, lowerCefr, type Cefr, type LevelRanges } from "./cefr";

export type Band = "band1" | "band2" | "band3";

export type McqItem = { id: string; band: Band; correct: string; weight?: number };
export type McqAnswer = { question_id: string; selected_option: string | null };

export type Thresholds = {
  a1_overall_below: number;
  a2_band1_below: number;
  b1_band2_below: number;
  b2_band3_below: number;
  c1_band3_min: number;
  c1_overall_min: number;
  c2_band3_min: number;
  c2_overall_min: number;
};

/** Initial thresholds from SPEC 11.1; overridden by assessments.config.thresholds. */
export const DEFAULT_THRESHOLDS: Thresholds = {
  a1_overall_below: 0.2,
  a2_band1_below: 0.7,
  b1_band2_below: 0.55,
  b2_band3_below: 0.5,
  c1_band3_min: 0.5,
  c1_overall_min: 0.75,
  c2_band3_min: 0.8,
  c2_overall_min: 0.9,
};

export type McqScore = {
  correct: number;
  total: number;
  overall: number;
  bands: Record<Band, { correct: number; total: number; accuracy: number }>;
  level: Cefr;
};

export function scoreMcq(items: McqItem[], answers: McqAnswer[], thresholds: Thresholds = DEFAULT_THRESHOLDS): McqScore {
  const answerById = new Map(answers.map((a) => [a.question_id, a.selected_option]));
  const bands: McqScore["bands"] = {
    band1: { correct: 0, total: 0, accuracy: 0 },
    band2: { correct: 0, total: 0, accuracy: 0 },
    band3: { correct: 0, total: 0, accuracy: 0 },
  };
  let correct = 0;
  let total = 0;
  for (const item of items) {
    const weight = item.weight ?? 1;
    bands[item.band].total += weight;
    total += weight;
    if (answerById.get(item.id) === item.correct) {
      bands[item.band].correct += weight;
      correct += weight;
    }
  }
  for (const band of Object.values(bands)) band.accuracy = band.total > 0 ? band.correct / band.total : 0;
  const overall = total > 0 ? correct / total : 0;
  return { correct, total, overall, bands, level: mcqLevel({ overall, band1: bands.band1.accuracy, band2: bands.band2.accuracy, band3: bands.band3.accuracy }, thresholds) };
}

/**
 * Level rule (SPEC 11.1): overall < 20% → A1; band1 < 70% → A2; band1 ≥ 70% and band2 < 55% → B1;
 * band2 ≥ 55% and band3 < 50% → B2; band3 ≥ 50% and overall ≥ 75% → C1; band3 ≥ 80% and overall ≥ 90% → C2.
 * When band3 ≥ 50% but overall < 75%, the candidate stays at B2.
 */
export function mcqLevel(acc: { overall: number; band1: number; band2: number; band3: number }, t: Thresholds = DEFAULT_THRESHOLDS): Cefr {
  if (acc.overall < t.a1_overall_below) return "A1";
  if (acc.band1 < t.a2_band1_below) return "A2";
  if (acc.band2 < t.b1_band2_below) return "B1";
  if (acc.band3 < t.b2_band3_below) return "B2";
  if (acc.band3 >= t.c2_band3_min && acc.overall >= t.c2_overall_min) return "C2";
  if (acc.band3 >= t.c1_band3_min && acc.overall >= t.c1_overall_min) return "C1";
  return "B2";
}

export type WritingGrade = {
  task_achievement: number;
  coherence: number;
  lexical_range: number;
  grammatical_accuracy: number;
  total: number;
  level: Cefr;
  feedback: string[];
  flags: { off_topic: boolean; too_short: boolean };
};

export function writingLevel(total: number, ranges?: LevelRanges): Cefr {
  return levelFromRubricTotal(total, ranges);
}

export type CombinedResult = {
  finalLevel: Cefr;
  status: "validated" | "pending_validation";
  reasons: string[];
};

/**
 * Final written level: the lower of MCQ and writing. Sent to admin validation when the two differ by two
 * or more levels or any flag is set. Without a writing grade (expired after grace), the MCQ level stands and
 * the attempt is validated automatically.
 */
export function combineWrittenLevels(mcq: Cefr, writing: WritingGrade | null, gapForValidation = 2): CombinedResult {
  if (!writing) return { finalLevel: mcq, status: "validated", reasons: ["writing_excluded"] };
  const reasons: string[] = [];
  const finalLevel = lowerCefr(mcq, writing.level);
  if (cefrGap(mcq, writing.level) >= gapForValidation) reasons.push("level_gap");
  if (writing.flags.off_topic) reasons.push("off_topic");
  if (writing.flags.too_short) reasons.push("too_short");
  return { finalLevel, status: reasons.length > 0 ? "pending_validation" : "validated", reasons };
}

/** Draws items respecting band quotas, deterministic for a given seed (attempt id). */
export function drawItems<T extends { id: string; band: Band }>(bank: T[], quotas: Record<Band, number>, seed: string): T[] {
  const rng = seededRandom(seed);
  const out: T[] = [];
  for (const band of ["band1", "band2", "band3"] as Band[]) {
    const pool = bank.filter((i) => i.band === band);
    const shuffled = shuffle(pool, rng);
    out.push(...shuffled.slice(0, Math.min(quotas[band], shuffled.length)));
  }
  return out;
}

export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}
