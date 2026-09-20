import { buildDiscReport, type DiscReport, type DiscScores } from "./disc";
import { DISC_COPY_EN } from "./disc-copy.en";
import { DISC_COPY_ES } from "./disc-copy.es";

export const DISC_COPY = { en: DISC_COPY_EN, es: DISC_COPY_ES };

export function discReport(scores: DiscScores): DiscReport {
  return buildDiscReport(scores, DISC_COPY);
}
