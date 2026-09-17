import type { Database } from "@/types/database";

export type Cefr = Database["public"]["Enums"]["cefr_level"];

export const CEFR_ORDER: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function cefrIndex(level: Cefr): number {
  return CEFR_ORDER.indexOf(level);
}

export function lowerCefr(a: Cefr, b: Cefr): Cefr {
  return cefrIndex(a) <= cefrIndex(b) ? a : b;
}

export function cefrGap(a: Cefr, b: Cefr): number {
  return Math.abs(cefrIndex(a) - cefrIndex(b));
}

/** Maps a 0-20 rubric total to a level using inclusive ranges, e.g. { A2: [0,5], B1: [6,9] }. */
export type LevelRanges = Partial<Record<Cefr, [number, number]>>;

export const DEFAULT_RUBRIC_LEVELS: LevelRanges = {
  A2: [0, 5],
  B1: [6, 9],
  B2: [10, 13],
  C1: [14, 17],
  C2: [18, 20],
};

export function levelFromRubricTotal(
  total: number,
  ranges: LevelRanges = DEFAULT_RUBRIC_LEVELS,
): Cefr {
  const rounded = Math.round(total);
  for (const level of CEFR_ORDER) {
    const range = ranges[level];
    if (range && rounded >= range[0] && rounded <= range[1]) return level;
  }
  return rounded < 0 ? "A1" : "C2";
}
