/**
 * Compresses a band map (factor or style -> low | mid | high) for a one-line summary in the
 * company's recommended panel. Mid-range entries are the default and are left out; the
 * caller says "all mid range" when nothing stands out.
 */
export type BandSummary = { high: string[]; low: string[]; allMid: boolean };

export function summarizeBands(bands: Record<string, string>): BandSummary {
  const high: string[] = [];
  const low: string[] = [];
  for (const [key, band] of Object.entries(bands)) {
    if (band === "high") high.push(key);
    else if (band === "low") low.push(key);
  }
  return { high, low, allMid: high.length === 0 && low.length === 0 };
}
