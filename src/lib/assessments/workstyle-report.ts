import { buildWorkstyleReport, type WorkstyleReport, type WorkstyleScores } from "./workstyle";
import {
  DISCLAIMER_EN,
  FACTOR_COPY_EN,
  FACTOR_LABELS_EN,
  SJT_STRENGTH_EN,
  SJT_SUMMARY_EN,
  STRENGTHS_EN,
} from "./workstyle-copy.en";
import {
  DISCLAIMER_ES,
  FACTOR_COPY_ES,
  FACTOR_LABELS_ES,
  SJT_STRENGTH_ES,
  SJT_SUMMARY_ES,
  STRENGTHS_ES,
} from "./workstyle-copy.es";

export const WORKSTYLE_COPY = {
  en: {
    labels: FACTOR_LABELS_EN,
    factors: FACTOR_COPY_EN,
    sjt: SJT_SUMMARY_EN,
    strengths: STRENGTHS_EN,
    sjtStrength: SJT_STRENGTH_EN,
    disclaimer: DISCLAIMER_EN,
  },
  es: {
    labels: FACTOR_LABELS_ES,
    factors: FACTOR_COPY_ES,
    sjt: SJT_SUMMARY_ES,
    strengths: STRENGTHS_ES,
    sjtStrength: SJT_STRENGTH_ES,
    disclaimer: DISCLAIMER_ES,
  },
};

export function workstyleReport(scores: WorkstyleScores, strengthSjtMin = 7): WorkstyleReport {
  return buildWorkstyleReport(scores, WORKSTYLE_COPY, strengthSjtMin);
}
