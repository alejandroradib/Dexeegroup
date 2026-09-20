import { useFormatter, useLocale, useTranslations } from "next-intl";

import { StatusChip } from "@/components/shared/status-chip";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { DiscReport } from "@/lib/assessments/disc";
import type { Band } from "@/lib/assessments/english-written";
import type { WorkstyleReport } from "@/lib/assessments/workstyle";
import type { Attempt } from "@/server/services/assessments";

type WrittenReport = {
  mcq: {
    correct: number;
    total: number;
    level: string;
    bands: Record<Band, { correct: number; total: number; accuracy: number }>;
  };
  writing: {
    total: number;
    level: string;
    feedback: string[];
    scores: Record<string, number>;
  } | null;
  final_level: string;
  reasons: string[];
};

function LevelHero({
  level,
  pending,
  label,
}: {
  level: string | null;
  pending: boolean;
  label: string;
}) {
  const t = useTranslations("assessments.result");
  return (
    <div className="bg-navy rounded-[16px] p-8 text-white">
      <p className="text-sm text-white/70">{label}</p>
      <p className="font-heading text-green mt-2 text-5xl font-extrabold">{level ?? "—"}</p>
      {pending ? <p className="mt-2 text-sm text-white/80">{t("levelPending")}</p> : null}
    </div>
  );
}

export function WrittenResult({ attempt }: { attempt: Attempt }) {
  const t = useTranslations("assessments.result");
  const format = useFormatter();
  const report = attempt.report as WrittenReport | null;
  const pending = attempt.status === "pending_validation";
  if (attempt.status === "failed") return <Alert variant="danger">{t("failed")}</Alert>;
  if (!report) return <Alert>{t("levelPending")}</Alert>;
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="grid gap-4 self-start">
        <LevelHero level={attempt.final_level} pending={pending} label={t("level")} />
        {pending ? <Alert variant="warning">{t("validationNote")}</Alert> : null}
        {attempt.validation_comment ? (
          <Alert>
            <span className="font-semibold">{t("reviewerComment")}:</span>{" "}
            {attempt.validation_comment}
          </Alert>
        ) : null}
        {attempt.submitted_at ? (
          <p className="text-muted-foreground text-xs">
            {t("integrityNote", { date: format.dateTime(new Date(attempt.submitted_at), "long") })}
          </p>
        ) : null}
      </div>
      <div className="grid gap-6">
        <section className="border-border rounded-[12px] border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">{t("mcq")}</h2>
            <Badge variant="info">{report.mcq.level}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("correctOf", { correct: report.mcq.correct, total: report.mcq.total })}
          </p>
          <ul className="mt-4 grid gap-3">
            {(["band1", "band2", "band3"] as Band[]).map((band) => (
              <li key={band} className="grid grid-cols-[1fr_120px_50px] items-center gap-3 text-sm">
                <span>{t(`bands.${band}`)}</span>
                <div className="bg-mist h-2 rounded-full">
                  <div
                    className="bg-navy h-2 rounded-full"
                    style={{ width: `${report.mcq.bands[band].accuracy * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-right">
                  {Math.round(report.mcq.bands[band].accuracy * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border rounded-[12px] border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base">{t("writing")}</h2>
            {report.writing ? <Badge variant="info">{report.writing.level}</Badge> : null}
          </div>
          {report.writing ? (
            <>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(report.writing.scores).map(([key, value]) => (
                  <li
                    key={key}
                    className="bg-mist flex items-center justify-between rounded-[8px] px-3 py-2 text-sm"
                  >
                    <span>{t(`criteria.${key as "coherence"}`)}</span>
                    <span className="font-semibold">{value}/5</span>
                  </li>
                ))}
              </ul>
              <h3 className="text-navy mt-4 text-sm font-semibold">{t("feedback")}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {report.writing.feedback.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">{t("writingExcluded")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

type OralAiResult = {
  answers?: {
    question_id: string;
    fluency: number;
    coherence: number;
    lexical_range: number;
    grammatical_accuracy: number;
    total: number;
    comment: string;
  }[];
  feedback?: string[];
  average?: number;
};

export function OralResult({ attempt }: { attempt: Attempt }) {
  const t = useTranslations("assessments.result");
  const ai = attempt.ai_result as OralAiResult | null;
  const validated = attempt.status === "validated";
  if (attempt.status === "failed") return <Alert variant="danger">{t("failed")}</Alert>;
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="grid gap-4 self-start">
        <LevelHero
          level={validated ? attempt.final_level : attempt.ai_level}
          pending={!validated}
          label={t("level")}
        />
        <StatusChip kind="attempt" status={attempt.status} />
        {!validated ? <Alert variant="warning">{t("oralPending")}</Alert> : null}
        {attempt.validation_comment ? (
          <Alert>
            <span className="font-semibold">{t("reviewerComment")}:</span>{" "}
            {attempt.validation_comment}
          </Alert>
        ) : null}
      </div>
      <div className="grid gap-6">
        {ai?.feedback ? (
          <section className="border-border rounded-[12px] border bg-white p-5">
            <h2 className="text-base">{t("feedback")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {ai.feedback.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {ai?.answers ? (
          <section className="border-border rounded-[12px] border bg-white p-5">
            <h2 className="text-base">{t("answers")}</h2>
            <ul className="mt-3 grid gap-3">
              {ai.answers.map((a, i) => (
                <li key={a.question_id} className="bg-mist rounded-[10px] p-3 text-sm">
                  <p className="text-navy font-medium">
                    {i + 1}. {a.total}/20
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("criteria.fluency")} {a.fluency} · {t("criteria.coherence")} {a.coherence} ·{" "}
                    {t("criteria.lexical_range")} {a.lexical_range} ·{" "}
                    {t("criteria.grammatical_accuracy")} {a.grammatical_accuracy}
                  </p>
                  {a.comment ? <p className="mt-1">{a.comment}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function WorkstyleResult({
  attempt,
  visibilityControl,
}: {
  attempt: Attempt;
  visibilityControl: React.ReactNode;
}) {
  const t = useTranslations("assessments.result.workstyle");
  const tr = useTranslations("assessments.result");
  const locale = useLocale() === "es" ? "es" : "en";
  const report = attempt.report as WorkstyleReport | null;
  if (!report) return <Alert>{tr("levelPending")}</Alert>;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("factors")}</h2>
          <ul className="mt-4 grid gap-5">
            {Object.entries(report.factors).map(([factor, f]) => (
              <li key={factor}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy font-semibold">{f.label[locale]}</span>
                  <span className="text-muted-foreground">{f.scaled}/100</span>
                </div>
                <div className="bg-mist mt-1 h-2 rounded-full">
                  <div className="bg-green h-2 rounded-full" style={{ width: `${f.scaled}%` }} />
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-medium">{t("preferences")}:</span> {f.preferences[locale]}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  <span className="text-foreground font-medium">{t("environments")}:</span>{" "}
                  {f.environments[locale]}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("sjt")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("sjtScore", { score: report.sjt.score, total: report.sjt.total })}
          </p>
          <p className="mt-2 text-sm">{report.sjt.summary[locale]}</p>
        </section>
      </div>
      <aside className="grid gap-4 self-start">
        <section className="bg-navy rounded-[16px] p-6 text-white">
          <h2 className="text-base text-white">{t("strengths")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/90">
            {report.strengths[locale].map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-green">•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border rounded-[12px] border bg-white p-5">
          {visibilityControl}
          <p className="text-muted-foreground mt-2 text-xs">{t("visibilityHint")}</p>
        </section>
        <p className="text-muted-foreground text-xs">{report.disclaimer[locale]}</p>
      </aside>
    </div>
  );
}

/** DISC-style profile result. Same shape as the work-style view: descriptors, not verdicts. */
export function DiscResult({
  attempt,
  visibilityControl,
}: {
  attempt: Attempt;
  visibilityControl: React.ReactNode;
}) {
  const t = useTranslations("assessments.result.disc");
  const tr = useTranslations("assessments.result");
  const locale = useLocale() === "es" ? "es" : "en";
  const report = attempt.report as DiscReport | null;
  if (!report) return <Alert>{tr("levelPending")}</Alert>;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <section className="bg-navy rounded-[16px] p-6 text-white">
          <p className="text-xs tracking-wide text-white/70 uppercase">{t("headline")}</p>
          <p className="font-heading mt-2 text-2xl font-bold text-white">
            {report.headline[locale]}
          </p>
        </section>
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("styles")}</h2>
          <ul className="mt-4 grid gap-5">
            {Object.entries(report.styles).map(([style, f]) => (
              <li key={style}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy font-semibold">
                    <span className="text-green font-heading mr-2">{style}</span>
                    {f.label[locale]}
                  </span>
                  <span className="text-muted-foreground">{f.scaled}/100</span>
                </div>
                <div className="bg-mist mt-1 h-2 rounded-full">
                  <div className="bg-green h-2 rounded-full" style={{ width: `${f.scaled}%` }} />
                </div>
                <p className="mt-2 text-sm">
                  <span className="font-medium">{t("preferences")}:</span> {f.preferences[locale]}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  <span className="text-foreground font-medium">{t("environments")}:</span>{" "}
                  {f.environments[locale]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className="grid gap-4 self-start">
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("strengths")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.strengths[locale].map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-green">•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border rounded-[12px] border bg-white p-5">
          {visibilityControl}
          <p className="text-muted-foreground mt-2 text-xs">{t("visibilityHint")}</p>
        </section>
        <p className="text-muted-foreground text-xs">{report.disclaimer[locale]}</p>
      </aside>
    </div>
  );
}
