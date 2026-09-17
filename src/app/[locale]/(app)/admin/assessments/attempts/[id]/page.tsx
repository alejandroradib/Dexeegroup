import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import {
  AttemptValidationForm,
  AudioPlayerButton,
} from "@/components/domain/admin/attempt-validation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AiAnswer = {
  question_id: string;
  fluency: number;
  coherence: number;
  lexical_range: number;
  grammatical_accuracy: number;
  total: number;
  comment: string;
};
type OralAi = {
  answers?: AiAnswer[];
  feedback?: string[];
  wpm?: { question_id: string; wpm: number }[];
  error?: string;
};
type WrittenReport = {
  mcq: { correct: number; total: number; level: string };
  writing: { total: number; level: string; feedback: string[] } | null;
  reasons: string[];
};

export default async function AdminAttemptPage({
  params,
}: PageProps<"/[locale]/admin/assessments/attempts/[id]">) {
  await pageLocale(params);
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: attempt }, t, te, tn, format] = await Promise.all([
    admin
      .from("assessment_attempts")
      .select("*, assessments (type, title), candidates (first_name, last_name)")
      .eq("id", id)
      .maybeSingle(),
    getTranslations("assessments.admin"),
    getTranslations("enums"),
    getTranslations("nav.admin"),
    getFormatter(),
  ]);
  if (!attempt || !attempt.assessments) notFound();
  const [{ data: questions }, { data: answers }] = await Promise.all([
    attempt.question_ids.length
      ? admin.from("assessment_questions").select("*").in("id", attempt.question_ids)
      : Promise.resolve({ data: [] }),
    admin.from("assessment_answers").select("*").eq("attempt_id", id),
  ]);
  const type = attempt.assessments.type;
  const isOral = type === "english_oral";
  const integrity =
    (attempt.integrity as { tab_leaves?: number; submitted_after_expiry?: boolean } | null) ?? {};
  const ai = attempt.ai_result as OralAi | null;
  const written = type === "english_written" ? (attempt.report as WrittenReport | null) : null;
  const { assessments: _a, candidates: _c, ...attemptRow } = attempt;
  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));

  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0">
        <Link href="/admin/assessments">
          <ArrowLeftIcon /> {tn("assessments")}
        </Link>
      </Button>
      <PageHeader
        title={`${attempt.candidates?.first_name ?? ""} ${attempt.candidates?.last_name ?? ""}`}
        eyebrow={te(`assessment_type.${type}`)}
        description={
          attempt.submitted_at
            ? format.dateTime(new Date(attempt.submitted_at), {
                dateStyle: "long",
                timeStyle: "short",
              })
            : undefined
        }
        actions={
          <>
            <StatusChip kind="attempt" status={attempt.status} />
            {attempt.ai_level ? (
              <Badge variant="info">
                {t("aiLevel")}: {attempt.ai_level}
              </Badge>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <section className="border-border rounded-[12px] border bg-white p-5 text-sm">
            <h2 className="text-base">{t("integrity")}</h2>
            <p className="mt-2">
              {t("tabLeaves", { count: integrity.tab_leaves ?? 0 })}
              {integrity.submitted_after_expiry ? ` · ${t("afterExpiry")}` : ""}
            </p>
            {ai?.error ? (
              <Alert variant="danger" className="mt-3">
                {ai.error}
              </Alert>
            ) : null}
            {written ? (
              <p className="mt-2">
                {t("mcqSummary", {
                  correct: written.mcq.correct,
                  total: written.mcq.total,
                  level: written.mcq.level,
                })}
                {written.reasons.length
                  ? ` · ${t("reasons", { reasons: written.reasons.join(", ") })}`
                  : ""}
              </p>
            ) : null}
          </section>
          <section className="border-border rounded-[12px] border bg-white p-5">
            <h2 className="text-base">{t("answers")}</h2>
            <ul className="mt-3 grid gap-4">
              {(answers ?? [])
                .filter((a) =>
                  isOral
                    ? a.audio_path
                    : type === "english_written"
                      ? questionById.get(a.question_id)?.question_type === "writing"
                      : false,
                )
                .map((a) => {
                  const q = questionById.get(a.question_id);
                  const grade = ai?.answers?.find((x) => x.question_id === a.question_id);
                  const wpm = ai?.wpm?.find((x) => x.question_id === a.question_id)?.wpm;
                  return (
                    <li key={a.id} className="border-border rounded-[12px] border p-4">
                      <p className="text-navy text-sm font-medium">{q?.prompt}</p>
                      {isOral ? (
                        <div className="mt-3 grid gap-3">
                          <AudioPlayerButton attemptId={attempt.id} questionId={a.question_id} />
                          <div>
                            <p className="text-muted-foreground text-xs font-semibold uppercase">
                              {t("transcript")}
                              {wpm ? ` · ${t("wpm", { wpm })}` : ""}
                            </p>
                            <p className="mt-1 text-sm whitespace-pre-line">
                              {a.transcript ?? t("noTranscript")}
                            </p>
                          </div>
                          {grade ? (
                            <p className="text-muted-foreground text-xs">
                              {grade.total}/20 · F {grade.fluency} · C {grade.coherence} · L{" "}
                              {grade.lexical_range} · G {grade.grammatical_accuracy}
                              {grade.comment ? ` · ${grade.comment}` : ""}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-muted-foreground text-xs font-semibold uppercase">
                            {t("writingResponse")}
                          </p>
                          <p className="bg-mist mt-1 rounded-[8px] p-3 text-sm whitespace-pre-line">
                            {a.answer_text}
                          </p>
                          {written?.writing ? (
                            <p className="text-muted-foreground mt-2 text-xs">
                              {written.writing.total}/20 · {written.writing.level} ·{" "}
                              {written.writing.feedback.join(" ")}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        </div>
        <aside className="lg:self-start">
          <AttemptValidationForm attempt={attemptRow} isOral={isOral} />
        </aside>
      </div>
    </>
  );
}
