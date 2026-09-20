import { getTranslations } from "next-intl/server";

import { summarizeBands } from "@/lib/fit/profile";
import type { ValidResult } from "@/server/services/jobs";

/**
 * One line each for English, Big Five and DISC under a ranked applicant (Phase 10). Reads
 * the valid results the database already filtered for this company: levels for English,
 * band descriptors for the two work profiles when the candidate shares them, never scores.
 */
export async function RecommendedProfile({ results }: { results: ValidResult[] }) {
  const t = await getTranslations("company.pipeline.recommended.profile");
  const te = await getTranslations("enums");
  const oral = results.find((r) => r.type === "english_oral")?.finalLevel ?? null;
  const written = results.find((r) => r.type === "english_written")?.finalLevel ?? null;
  const bigFive = results.find((r) => r.type === "psychometric");
  const disc = results.find((r) => r.type === "disc");

  const english =
    oral || written
      ? [
          oral ? t("oral", { level: oral }) : null,
          written ? t("written", { level: written }) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : t("noResult");

  function bandsLine(result: ValidResult | undefined, label: (key: string) => string): string {
    if (!result) return t("noResult");
    if (!result.bands) return t("hidden");
    const summary = summarizeBands(result.bands);
    if (summary.allMid) return t("allMid");
    const parts = [
      ...summary.high.map((k) => t("band", { name: label(k), band: te("workstyle_band.high") })),
      ...summary.low.map((k) => t("band", { name: label(k), band: te("workstyle_band.low") })),
    ];
    return parts.join(", ");
  }

  const rows: { key: string; label: string; value: string }[] = [
    { key: "english", label: t("english"), value: english },
    {
      key: "bigFive",
      label: t("bigFive"),
      value: bandsLine(bigFive, (k) => te(`workstyle_factor.${k as "intellect"}`)),
    },
    { key: "disc", label: t("disc"), value: bandsLine(disc, (k) => te(`disc_style.${k as "D"}`)) },
  ];

  return (
    <dl className="mt-3 grid gap-1 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-3">
      {rows.map((row) => (
        <div key={row.key} className="contents">
          <dt className="text-muted-foreground font-medium">{row.label}</dt>
          <dd className="text-navy">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
