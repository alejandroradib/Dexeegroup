import { ClipboardCheckIcon, LanguagesIcon, MicIcon, SparklesIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AssessmentHubItem } from "@/server/services/candidates";

const ICONS = {
  english_written: LanguagesIcon,
  english_oral: MicIcon,
  psychometric: SparklesIcon,
} as const;

export async function AssessmentsHub({ items }: { items: AssessmentHubItem[] }) {
  const t = await getTranslations("candidate.assessments");
  const tc = await getTranslations("common");
  const te = await getTranslations("enums");
  const format = await getFormatter();

  if (items.length === 0)
    return <EmptyState icon={ClipboardCheckIcon} title={t("empty")} description={t("emptyBody")} />;

  return (
    <div className="grid gap-6">
      <Alert className="text-xs">
        {t("notice", { days: items[0]?.assessment.cooldown_days ?? 90 })}
      </Alert>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ assessment, latest, open, nextAllowedAt, remainingMinutes, canStart }) => {
          const Icon = ICONS[assessment.type];
          let state: string;
          let cta: {
            label: string;
            href: string;
            variant: "accent" | "outline" | "default";
          } | null = null;
          const base = `/candidate/assessments/${assessment.type}`;
          if (open) {
            state =
              remainingMinutes !== null && remainingMinutes > 0
                ? t("states.in_progress", { time: `${remainingMinutes} min` })
                : t("states.in_progress_no_timer");
            cta = { label: t("continue"), href: `${base}/attempt/${open.id}`, variant: "accent" };
          } else if (latest && ["submitted", "processing", "ai_scored"].includes(latest.status)) {
            state = t("states.processing");
          } else if (latest?.status === "pending_validation") {
            state = t("states.pending_validation");
          } else if (latest?.status === "failed") {
            state = t("states.failed");
          } else if (latest?.status === "validated") {
            state = latest.final_level
              ? `${t("states.completed")} · ${t("level", { level: latest.final_level })}`
              : t("states.completed");
            cta = {
              label: t("viewResult"),
              href: `${base}/result/${latest.id}`,
              variant: "outline",
            };
          } else {
            state = t("states.not_started");
          }
          return (
            <article
              key={assessment.id}
              className="border-border flex flex-col rounded-[12px] border bg-white p-5"
            >
              <span className="bg-mint text-navy mb-3 flex size-10 items-center justify-center rounded-[10px]">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg">{te(`assessment_type.${assessment.type}`)}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{assessment.description}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                {assessment.time_limit_minutes && assessment.type !== "psychometric"
                  ? t("timeLimit", { minutes: assessment.time_limit_minutes })
                  : t("noTimeLimit")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {latest ? <StatusChip kind="attempt" status={latest.status} /> : null}
                <span className="text-navy text-sm font-medium">{state}</span>
              </div>
              {nextAllowedAt && !canStart && !open ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  {t("states.available_again", {
                    date: format.dateTime(new Date(nextAllowedAt), "long"),
                  })}
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {cta ? (
                  <Button asChild variant={cta.variant} size="sm">
                    <Link href={cta.href}>{cta.label}</Link>
                  </Button>
                ) : null}
                {canStart && !open ? (
                  <Button
                    asChild
                    variant={latest?.status === "validated" ? "ghost" : "accent"}
                    size="sm"
                  >
                    <Link href={base}>{latest ? tc("actions.retry") : t("start")}</Link>
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
