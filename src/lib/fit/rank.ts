/**
 * Ordering and tiers for the recommended panel (Phase 10). Pure so the top 3 / top 5 rule
 * is tested once and read the same way by the company page and the admin.
 */

export type RankableFit = {
  applicationId: string;
  score: number | null;
  /** ISO time the application was created; earlier applicants win ties. */
  appliedAt: string;
};

export type RankedFit<T extends RankableFit> = T & {
  rank: number | null;
  tier: "top3" | "top5" | "rest" | "pending";
};

/** Scored applicants by score desc, then by application time; unscored ones follow, unranked. */
export function rankFits<T extends RankableFit>(items: T[]): RankedFit<T>[] {
  const scored = items
    .filter((i) => i.score !== null)
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) ||
        new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime(),
    );
  const pending = items.filter((i) => i.score === null);
  return [
    ...scored.map((item, index) => ({
      ...item,
      rank: index + 1,
      tier: (index < 3 ? "top3" : index < 5 ? "top5" : "rest") as RankedFit<T>["tier"],
    })),
    ...pending.map((item) => ({ ...item, rank: null, tier: "pending" as const })),
  ];
}
