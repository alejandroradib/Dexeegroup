import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { rankFits } from "@/lib/fit/rank";
import type { PipelineCard } from "@/server/services/jobs";

import { RecommendedProfile } from "./recommended-profile";
import { RefreshFitButton } from "./refresh-fit-button";

/**
 * Ranked applicants for one job (Phase 10). Top 3 and top 5 are called out so the hiring
 * manager knows whom to interview first. The copy says, and the layout repeats, that this
 * is a recommendation: the board below is where decisions are made.
 */
export async function RecommendedPanel({
  jobId,
  cards,
  onOpen,
}: {
  jobId: string;
  cards: PipelineCard[];
  /** Query string that opens a card's drawer; the panel links into the board. */
  onOpen: (applicationId: string) => string;
}) {
  const t = await getTranslations("company.pipeline.recommended");
  const format = await getFormatter();
  const active = cards.filter((c) => !["withdrawn", "rejected"].includes(c.application.status));
  const ranked = rankFits(
    active.map((card) => ({
      applicationId: card.application.id,
      score: card.fit?.status === "ready" ? card.fit.score : null,
      appliedAt: card.application.created_at,
      card,
    })),
  );
  const scored = ranked.filter((r) => r.tier !== "pending");
  const pending = ranked.filter((r) => r.tier === "pending");
  const skipped = active.some((c) => c.fit?.status === "skipped");

  return (
    <section className="border-border mb-6 rounded-[12px] border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-base">{t("title")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("body")}</p>
        </div>
        <RefreshFitButton jobId={jobId} />
      </div>
      {skipped ? <p className="text-warning mt-3 text-xs">{t("unavailable")}</p> : null}
      {scored.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">{t("empty")}</p>
      ) : (
        <ol className="mt-4 grid gap-3">
          {scored.map((item) => {
            const c = item.card.candidate;
            const fit = item.card.fit;
            return (
              <li
                key={item.applicationId}
                className={
                  item.tier === "top3"
                    ? "border-green rounded-[12px] border-2 p-4"
                    : "border-border rounded-[12px] border p-4"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-navy text-lg font-bold">{item.rank}</span>
                    <a
                      href={onOpen(item.applicationId)}
                      className="text-navy font-semibold hover:underline"
                    >
                      {c ? `${c.first_name} ${c.last_initial ?? ""}.` : "—"}
                    </a>
                    {item.tier === "top3" ? <Badge variant="success">{t("top3")}</Badge> : null}
                    {item.tier === "top5" ? <Badge variant="accent">{t("top5")}</Badge> : null}
                  </div>
                  <span className="text-navy text-sm font-semibold tabular-nums">
                    {t("score", { score: item.score ?? 0 })}
                  </span>
                </div>
                <RecommendedProfile results={item.card.results} />
                {fit?.summary ? <p className="mt-2 text-sm">{fit.summary}</p> : null}
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                  {fit && fit.strengths.length > 0 ? (
                    <div>
                      <p className="text-muted-foreground font-medium">{t("strengths")}</p>
                      <ul className="mt-1 list-disc pl-4">
                        {fit.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {fit && fit.gaps.length > 0 ? (
                    <div>
                      <p className="text-muted-foreground font-medium">{t("gaps")}</p>
                      <ul className="mt-1 list-disc pl-4">
                        {fit.gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {fit?.computedAt ? (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t("computedAt", { date: format.dateTime(new Date(fit.computedAt), "short") })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {pending.length > 0 ? (
        <div className="mt-4">
          <p className="text-muted-foreground text-xs">{t("pendingBody")}</p>
          <ul className="mt-2 grid gap-3">
            {pending.map((item) => {
              const c = item.card.candidate;
              return (
                <li
                  key={item.applicationId}
                  className="border-border rounded-[12px] border border-dashed p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={onOpen(item.applicationId)}
                      className="text-navy font-semibold hover:underline"
                    >
                      {c ? `${c.first_name} ${c.last_initial ?? ""}.` : "—"}
                    </a>
                    <Badge variant="outline">{t("pending")}</Badge>
                  </div>
                  <RecommendedProfile results={item.card.results} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
