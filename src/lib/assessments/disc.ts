/**
 * DISC-style work profile (Phase 10).
 *
 * Original items on the four-factor model of workplace behaviour described by Marston
 * (1928), which is in the public domain. This is not, and must never be presented as, a
 * commercial DiSC(R) instrument. Like the Big Five profile, it is context for a hiring
 * conversation and never a filter: the fit analysis may read it, a company may not sort by it.
 */

import { bandFor, DEFAULT_BANDS, type Band, type BandThresholds } from "./workstyle";

export const STYLES = ["D", "I", "S", "C"] as const;
export type Style = (typeof STYLES)[number];

export type DiscItem = { id: string; style: Style; reverse: boolean };
export type DiscAnswer = { question_id: string; likert_value: number | null };

export type StyleScore = { raw: number; scaled: number; band: Band; answered: number };
export type DiscScores = {
  styles: Record<Style, StyleScore>;
  /** Highest scaled style; ties resolve in D, I, S, C order. */
  primary: Style;
  /** Second highest, or null when the top two are more than the gap apart. */
  secondary: Style | null;
};

/** Points below the primary within which a second style still counts as part of the profile. */
const SECONDARY_GAP = 15;

/**
 * raw = sum of item values with reversed items as 6 − value. With seven items the range is
 * 7–35; scaled = (raw − 7) / 28 × 100. Unanswered items count as the midpoint so a skipped
 * item never pushes a style to an extreme.
 */
export function scoreStyles(
  items: DiscItem[],
  answers: DiscAnswer[],
  bands: BandThresholds = DEFAULT_BANDS,
): Record<Style, StyleScore> {
  const byId = new Map(answers.map((a) => [a.question_id, a.likert_value]));
  const result = {} as Record<Style, StyleScore>;
  for (const style of STYLES) {
    const styleItems = items.filter((i) => i.style === style);
    let raw = 0;
    let answered = 0;
    for (const item of styleItems) {
      const value = byId.get(item.id);
      if (value === null || value === undefined) {
        raw += 3;
        continue;
      }
      answered += 1;
      raw += item.reverse ? 6 - value : value;
    }
    const count = Math.max(1, styleItems.length);
    const min = count;
    const max = count * 5;
    const scaled = Math.round(((raw - min) / (max - min)) * 100);
    result[style] = { raw, scaled, band: bandFor(scaled, bands), answered };
  }
  return result;
}

export function scoreDisc(
  items: DiscItem[],
  answers: DiscAnswer[],
  bands: BandThresholds = DEFAULT_BANDS,
): DiscScores {
  const styles = scoreStyles(items, answers, bands);
  const ranked = [...STYLES].sort(
    (a, b) => styles[b].scaled - styles[a].scaled || STYLES.indexOf(a) - STYLES.indexOf(b),
  );
  const primary = ranked[0] ?? "D";
  const runnerUp = ranked[1] ?? null;
  const secondary =
    runnerUp && styles[primary].scaled - styles[runnerUp].scaled <= SECONDARY_GAP ? runnerUp : null;
  return { styles, primary, secondary };
}

export type DiscReport = {
  version: 1;
  styles: Record<
    Style,
    {
      scaled: number;
      band: Band;
      label: { en: string; es: string };
      preferences: { en: string; es: string };
      environments: { en: string; es: string };
    }
  >;
  primary: Style;
  secondary: Style | null;
  /** One line naming the profile, e.g. "Steadiness with Conscientiousness". */
  headline: { en: string; es: string };
  strengths: { en: string[]; es: string[] };
  disclaimer: { en: string; es: string };
};

export type DiscCopy = {
  labels: Record<Style, string>;
  styles: Record<Style, Record<Band, { preferences: string; environments: string }>>;
  strengths: Record<Style, string>;
  /** "{primary} with {secondary}" and "{primary}" templates. */
  headlinePair: string;
  headlineSingle: string;
  disclaimer: string;
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/** Deterministic report: same scores, same report. Strengths are the primary and secondary styles. */
export function buildDiscReport(
  scores: DiscScores,
  copy: { en: DiscCopy; es: DiscCopy },
): DiscReport {
  const styles = {} as DiscReport["styles"];
  for (const style of STYLES) {
    const { scaled, band } = scores.styles[style];
    styles[style] = {
      scaled,
      band,
      label: { en: copy.en.labels[style], es: copy.es.labels[style] },
      preferences: {
        en: copy.en.styles[style][band].preferences,
        es: copy.es.styles[style][band].preferences,
      },
      environments: {
        en: copy.en.styles[style][band].environments,
        es: copy.es.styles[style][band].environments,
      },
    };
  }
  const named = [scores.primary, ...(scores.secondary ? [scores.secondary] : [])];
  const headlineFor = (c: DiscCopy) =>
    scores.secondary
      ? fill(c.headlinePair, {
          primary: c.labels[scores.primary],
          secondary: c.labels[scores.secondary],
        })
      : fill(c.headlineSingle, { primary: c.labels[scores.primary] });
  return {
    version: 1,
    styles,
    primary: scores.primary,
    secondary: scores.secondary,
    headline: { en: headlineFor(copy.en), es: headlineFor(copy.es) },
    strengths: {
      en: named.map((s) => copy.en.strengths[s]),
      es: named.map((s) => copy.es.strengths[s]),
    },
    disclaimer: { en: copy.en.disclaimer, es: copy.es.disclaimer },
  };
}
