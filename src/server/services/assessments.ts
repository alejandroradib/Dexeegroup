import "server-only";

import { completeJson, aiConfigured } from "@/lib/ai/anthropic";
import {
  ENGLISH_ORAL_PROMPT_VERSION,
  englishOralSystem,
  englishOralUser,
  oralGradeSchema,
} from "@/lib/ai/prompts/english-oral";
import {
  ENGLISH_WRITING_PROMPT_VERSION,
  englishWritingSystem,
  englishWritingUser,
  writingGradeSchema,
} from "@/lib/ai/prompts/english-writing";
import { transcribe, transcriptionConfigured } from "@/lib/ai/transcription";
import type { Cefr } from "@/lib/assessments/cefr";
import { scoreDisc, type Style } from "@/lib/assessments/disc";
import { discReport } from "@/lib/assessments/disc-report";
import { oralLevel, wordsPerMinute } from "@/lib/assessments/english-oral";
import {
  combineWrittenLevels,
  DEFAULT_THRESHOLDS,
  drawItems,
  scoreMcq,
  seededRandom,
  shuffle,
  type Band,
  type Thresholds,
  type WritingGrade,
} from "@/lib/assessments/english-written";
import { toPublicQuestion, type PublicQuestion } from "@/lib/assessments/public-question";
import { scoreWorkstyle, type Factor } from "@/lib/assessments/workstyle";
import { workstyleReport } from "@/lib/assessments/workstyle-report";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

import { dispatchEvent } from "./events";

type Tables = Database["public"]["Tables"];
export type Attempt = Tables["assessment_attempts"]["Row"];
export type AssessmentRow = Tables["assessments"]["Row"];
export type QuestionRow = Tables["assessment_questions"]["Row"];
export type AnswerRow = Tables["assessment_answers"]["Row"];
export type AssessmentType = Database["public"]["Enums"]["assessment_type"];

export type { PublicQuestion } from "@/lib/assessments/public-question";

const GRACE_SECONDS = 60;
const MAX_PROCESSING_ATTEMPTS = 3;

export async function getAssessmentByType(type: AssessmentType): Promise<AssessmentRow | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("assessments").select("*").eq("type", type).maybeSingle();
  return data;
}

type WrittenConfig = {
  mcq_count?: number;
  band_quotas?: Record<Band, number>;
  thresholds?: Partial<Thresholds>;
  writing_levels?: Record<string, [number, number]>;
  validation_gap_levels?: number;
  grace_seconds?: number;
};
type OralConfig = { prompts_per_attempt?: number };
type PsychConfig = { bands?: { low_below: number; high_above: number }; strength_sjt_min?: number };
type DiscConfig = { bands?: { low_below: number; high_above: number } };

/** Draws the question set for a new attempt, deterministic per attempt id. */
export async function assignQuestions(
  attempt: Attempt,
  assessment: AssessmentRow,
): Promise<string[]> {
  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("assessment_questions")
    .select("*")
    .eq("assessment_id", assessment.id)
    .eq("is_active", true)
    .order("sort_order");
  const bank = questions ?? [];
  let chosen: QuestionRow[] = [];
  const rng = seededRandom(attempt.id);

  if (assessment.type === "english_written") {
    const config = (assessment.config ?? {}) as WrittenConfig;
    const quotas = config.band_quotas ?? { band1: 14, band2: 14, band3: 12 };
    const mcq = bank
      .filter((q) => q.question_type === "mcq")
      .map((q) => ({
        ...q,
        band: ((q.options as { band?: Band } | null)?.band ?? "band2") as Band,
      }));
    const drawn = drawItems(mcq, quotas, attempt.id);
    // Keep passage items together so the candidate reads each passage once.
    drawn.sort((a, b) => {
      const pa = (a.options as { passage?: { id: string } | null } | null)?.passage?.id ?? "";
      const pb = (b.options as { passage?: { id: string } | null } | null)?.passage?.id ?? "";
      if (pa !== pb) return pa.localeCompare(pb);
      return a.sort_order - b.sort_order;
    });
    const writing = shuffle(
      bank.filter((q) => q.question_type === "writing"),
      rng,
    ).slice(0, 1);
    chosen = [...drawn.map((d) => bank.find((q) => q.id === d.id) as QuestionRow), ...writing];
  } else if (assessment.type === "english_oral") {
    const config = (assessment.config ?? {}) as OralConfig;
    const count = config.prompts_per_attempt ?? 4;
    const categories = [...new Set(bank.map((q) => q.section))];
    const picked: QuestionRow[] = [];
    for (const category of shuffle(categories, rng)) {
      const options = shuffle(
        bank.filter((q) => q.section === category),
        rng,
      );
      if (options[0]) picked.push(options[0]);
      if (picked.length >= count) break;
    }
    if (picked.length < count) {
      for (const q of shuffle(bank, rng)) {
        if (picked.length >= count) break;
        if (!picked.some((p) => p.id === q.id)) picked.push(q);
      }
    }
    chosen = picked;
  } else {
    chosen = [
      ...bank.filter((q) => q.question_type === "likert"),
      ...bank.filter((q) => q.question_type === "situational"),
    ];
  }

  const ids = chosen.map((q) => q.id);
  await admin.from("assessment_attempts").update({ question_ids: ids }).eq("id", attempt.id);
  return ids;
}

export async function getAttemptWithQuestions(
  attemptId: string,
  candidateId: string,
): Promise<{
  attempt: Attempt;
  assessment: AssessmentRow;
  questions: PublicQuestion[];
  answers: AnswerRow[];
} | null> {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (!attempt) return null;
  const [{ data: assessment }, { data: questions }, { data: answers }] = await Promise.all([
    admin.from("assessments").select("*").eq("id", attempt.assessment_id).single(),
    attempt.question_ids.length
      ? admin.from("assessment_questions").select("*").in("id", attempt.question_ids)
      : Promise.resolve({ data: [] as QuestionRow[] }),
    admin.from("assessment_answers").select("*").eq("attempt_id", attemptId),
  ]);
  if (!assessment) return null;
  const order = new Map(attempt.question_ids.map((id, i) => [id, i]));
  const ordered = [...(questions ?? [])]
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map(toPublicQuestion);
  return { attempt, assessment, questions: ordered, answers: answers ?? [] };
}

export function isExpired(attempt: Attempt, graceSeconds = GRACE_SECONDS): boolean {
  if (!attempt.expires_at) return false;
  return Date.now() > new Date(attempt.expires_at).getTime() + graceSeconds * 1000;
}

// ---------------------------------------------------------------------------
// Submission and scoring
// ---------------------------------------------------------------------------

export async function scoreWrittenAttempt(
  attempt: Attempt,
  assessment: AssessmentRow,
  locale: "en" | "es",
): Promise<void> {
  const admin = createAdminClient();
  const config = (assessment.config ?? {}) as WrittenConfig;
  const thresholds: Thresholds = { ...DEFAULT_THRESHOLDS, ...(config.thresholds ?? {}) };
  const [{ data: questions }, { data: answers }] = await Promise.all([
    admin.from("assessment_questions").select("*").in("id", attempt.question_ids),
    admin.from("assessment_answers").select("*").eq("attempt_id", attempt.id),
  ]);
  const mcqItems = (questions ?? [])
    .filter((q) => q.question_type === "mcq")
    .map((q) => ({
      id: q.id,
      band: ((q.options as { band?: Band } | null)?.band ?? "band2") as Band,
      correct: String((q.answer_key as { correct?: string } | null)?.correct ?? ""),
      weight: Number(q.weight),
    }));
  const mcq = scoreMcq(
    mcqItems,
    (answers ?? []).map((a) => ({
      question_id: a.question_id,
      selected_option: a.selected_option,
    })),
    thresholds,
  );

  const writingQuestion = (questions ?? []).find((q) => q.question_type === "writing");
  const writingAnswer = writingQuestion
    ? (answers ?? []).find((a) => a.question_id === writingQuestion.id)
    : undefined;
  const submittedAfterExpiry = Boolean(
    (attempt.integrity as { submitted_after_expiry?: boolean } | null)?.submitted_after_expiry,
  );
  let writing: WritingGrade | null = null;
  let writingStatus: "graded" | "excluded" | "failed" = "excluded";

  if (
    writingQuestion &&
    writingAnswer?.answer_text &&
    writingAnswer.answer_text.trim().length > 0 &&
    !submittedAfterExpiry
  ) {
    if (!aiConfigured()) {
      writingStatus = "failed";
    } else {
      try {
        const opts =
          (writingQuestion.options as { min_words?: number; max_words?: number } | null) ?? {};
        const graded = await completeJson(
          writingGradeSchema,
          englishWritingSystem,
          englishWritingUser({
            prompt: writingQuestion.prompt,
            response: writingAnswer.answer_text,
            locale,
            minWords: opts.min_words ?? 150,
            maxWords: opts.max_words ?? 200,
          }),
          {
            feature: `english_writing:${ENGLISH_WRITING_PROMPT_VERSION}`,
            actorUserId: attempt.candidate_id,
            maxTokens: 800,
          },
        );
        writing = { ...graded, level: graded.level as Cefr };
        writingStatus = "graded";
        await admin
          .from("assessment_answers")
          .update({ ai_feedback: graded as unknown as Json })
          .eq("id", writingAnswer.id);
      } catch (error) {
        logger.error(
          { err: (error as Error).message, attemptId: attempt.id },
          "writing_grade_failed",
        );
        writingStatus = "failed";
      }
    }
  }

  if (writingStatus === "failed") {
    await admin
      .from("assessment_attempts")
      .update({
        status: "failed",
        ai_level: mcq.level,
        ai_result: { mcq, writing: null, error: "writing_grade_failed" } as unknown as Json,
        processing_attempts: attempt.processing_attempts + 1,
      })
      .eq("id", attempt.id);
    await dispatchEvent({ type: "processing_failed", attemptId: attempt.id });
    await dispatchEvent({ type: "assessment_result", attemptId: attempt.id, stage: "failed" });
    return;
  }

  const combined = combineWrittenLevels(mcq.level, writing, config.validation_gap_levels ?? 2);
  await admin
    .from("assessment_attempts")
    .update({
      status: combined.status,
      ai_level: writing ? writing.level : mcq.level,
      final_level: combined.finalLevel,
      final_score: Math.round(mcq.overall * 1000) / 10,
      ai_result: { mcq, writing, combined, writing_status: writingStatus } as unknown as Json,
      report: {
        mcq: { correct: mcq.correct, total: mcq.total, bands: mcq.bands, level: mcq.level },
        writing: writing
          ? {
              total: writing.total,
              level: writing.level,
              feedback: writing.feedback,
              scores: {
                task_achievement: writing.task_achievement,
                coherence: writing.coherence,
                lexical_range: writing.lexical_range,
                grammatical_accuracy: writing.grammatical_accuracy,
              },
            }
          : null,
        final_level: combined.finalLevel,
        reasons: combined.reasons,
      } as unknown as Json,
      ...(combined.status === "validated" ? { validated_at: new Date().toISOString() } : {}),
    })
    .eq("id", attempt.id);
  await dispatchEvent({
    type: "assessment_result",
    attemptId: attempt.id,
    stage: combined.status === "validated" ? "scored" : "pending_validation",
  });
}

export async function scorePsychometricAttempt(
  attempt: Attempt,
  assessment: AssessmentRow,
): Promise<void> {
  const admin = createAdminClient();
  const config = (assessment.config ?? {}) as PsychConfig;
  const [{ data: questions }, { data: answers }] = await Promise.all([
    admin.from("assessment_questions").select("*").in("id", attempt.question_ids),
    admin.from("assessment_answers").select("*").eq("attempt_id", attempt.id),
  ]);
  const likertItems = (questions ?? [])
    .filter((q) => q.question_type === "likert")
    .map((q) => {
      const key = (q.answer_key as { factor?: Factor; reverse?: boolean } | null) ?? {};
      return {
        id: q.id,
        factor: (key.factor ?? q.factor ?? "intellect") as Factor,
        reverse: Boolean(key.reverse),
      };
    });
  const sjtItems = (questions ?? [])
    .filter((q) => q.question_type === "situational")
    .map((q) => ({
      id: q.id,
      best: String((q.answer_key as { best?: string } | null)?.best ?? ""),
    }));
  const scores = scoreWorkstyle(
    likertItems,
    (answers ?? []).map((a) => ({ question_id: a.question_id, likert_value: a.likert_value })),
    sjtItems,
    (answers ?? []).map((a) => ({
      question_id: a.question_id,
      selected_option: a.selected_option,
    })),
    config.bands,
  );
  const report = workstyleReport(scores, config.strength_sjt_min ?? 7);
  await admin
    .from("assessment_attempts")
    .update({
      status: "validated",
      final_score: scores.sjt.score,
      ai_result: scores as unknown as Json,
      report: report as unknown as Json,
      validated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);
  await dispatchEvent({ type: "assessment_result", attemptId: attempt.id, stage: "scored" });
}

/** DISC-style profile: Likert only, scored deterministically, validated on submit like the work-style profile. */
export async function scoreDiscAttempt(attempt: Attempt, assessment: AssessmentRow): Promise<void> {
  const admin = createAdminClient();
  const config = (assessment.config ?? {}) as DiscConfig;
  const [{ data: questions }, { data: answers }] = await Promise.all([
    admin.from("assessment_questions").select("*").in("id", attempt.question_ids),
    admin.from("assessment_answers").select("*").eq("attempt_id", attempt.id),
  ]);
  const items = (questions ?? [])
    .filter((q) => q.question_type === "likert")
    .map((q) => {
      const key = (q.answer_key as { style?: Style; reverse?: boolean } | null) ?? {};
      return {
        id: q.id,
        style: (key.style ?? q.factor ?? "D") as Style,
        reverse: Boolean(key.reverse),
      };
    });
  const scores = scoreDisc(
    items,
    (answers ?? []).map((a) => ({ question_id: a.question_id, likert_value: a.likert_value })),
    config.bands,
  );
  const report = discReport(scores);
  await admin
    .from("assessment_attempts")
    .update({
      status: "validated",
      final_score: scores.styles[scores.primary].scaled,
      ai_result: scores as unknown as Json,
      report: report as unknown as Json,
      validated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);
  await dispatchEvent({ type: "assessment_result", attemptId: attempt.id, stage: "scored" });
}

/** Oral processing: transcribe every answer, grade with the model, move to pending_validation. Retries up to 3 times. */
export async function processOralAttempt(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || !["submitted", "processing", "failed"].includes(attempt.status)) return;
  if (attempt.processing_attempts >= MAX_PROCESSING_ATTEMPTS && attempt.status === "failed") return;
  await admin
    .from("assessment_attempts")
    .update({ status: "processing", processing_attempts: attempt.processing_attempts + 1 })
    .eq("id", attemptId);

  try {
    if (!transcriptionConfigured() || !aiConfigured()) throw new Error("ai_not_configured");
    const [{ data: questions }, { data: answers }, { data: profile }] = await Promise.all([
      admin.from("assessment_questions").select("*").in("id", attempt.question_ids),
      admin.from("assessment_answers").select("*").eq("attempt_id", attemptId),
      admin.from("profiles").select("locale").eq("id", attempt.candidate_id).maybeSingle(),
    ]);
    const graded: {
      question_id: string;
      prompt: string;
      transcript: string;
      durationSeconds: number;
      wpm: number;
    }[] = [];
    for (const answer of answers ?? []) {
      if (!answer.audio_path) continue;
      let transcript = answer.transcript ?? "";
      let duration = Number(answer.audio_duration_seconds ?? 0);
      if (!transcript) {
        const { data: signed, error } = await admin.storage
          .from("assessment-audio")
          .createSignedUrl(answer.audio_path, 600);
        if (error || !signed) throw new Error("audio_sign_failed");
        const result = await transcribe(
          signed.signedUrl,
          answer.audio_path.split("/").pop() ?? "answer.webm",
        );
        transcript = result.text;
        duration = duration || result.durationSeconds;
        await admin
          .from("assessment_answers")
          .update({ transcript, audio_duration_seconds: duration })
          .eq("id", answer.id);
      }
      const question = (questions ?? []).find((q) => q.id === answer.question_id);
      graded.push({
        question_id: answer.question_id,
        prompt: question?.prompt ?? "",
        transcript,
        durationSeconds: duration,
        wpm: wordsPerMinute(transcript, duration),
      });
    }
    if (graded.length === 0) throw new Error("no_audio_answers");
    const locale = profile?.locale ?? "en";
    const grade = await completeJson(
      oralGradeSchema,
      englishOralSystem,
      englishOralUser({ locale, answers: graded }),
      {
        feature: `english_oral:${ENGLISH_ORAL_PROMPT_VERSION}`,
        actorUserId: attempt.candidate_id,
        maxTokens: 1500,
      },
    );
    const computed = oralLevel(
      grade.answers.map((a) => ({
        fluency: a.fluency,
        coherence: a.coherence,
        lexical_range: a.lexical_range,
        grammatical_accuracy: a.grammatical_accuracy,
        total: a.total,
      })),
    );
    for (const a of grade.answers) {
      await admin
        .from("assessment_answers")
        .update({ ai_feedback: a as unknown as Json })
        .eq("attempt_id", attemptId)
        .eq("question_id", a.question_id);
    }
    await admin
      .from("assessment_attempts")
      .update({
        status: "pending_validation",
        ai_level: computed.level,
        ai_result: {
          ...grade,
          computed,
          wpm: graded.map((g) => ({ question_id: g.question_id, wpm: g.wpm })),
        } as unknown as Json,
      })
      .eq("id", attemptId);
    await dispatchEvent({ type: "assessment_result", attemptId, stage: "pending_validation" });
  } catch (error) {
    const attempts = attempt.processing_attempts + 1;
    logger.error({ err: (error as Error).message, attemptId, attempts }, "oral_processing_failed");
    if (attempts >= MAX_PROCESSING_ATTEMPTS) {
      await admin
        .from("assessment_attempts")
        .update({
          status: "failed",
          ai_result: { error: (error as Error).message } as unknown as Json,
        })
        .eq("id", attemptId);
      await dispatchEvent({ type: "processing_failed", attemptId });
      await dispatchEvent({ type: "assessment_result", attemptId, stage: "failed" });
    } else {
      await admin.from("assessment_attempts").update({ status: "submitted" }).eq("id", attemptId);
    }
  }
}

/** Cron entry point: expire stale attempts and process submitted oral attempts. */
export async function processPendingAttempts(): Promise<{ expired: number; processed: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - GRACE_SECONDS * 1000).toISOString();
  const { data: expired } = await admin
    .from("assessment_attempts")
    .update({ status: "expired" })
    .eq("status", "in_progress")
    .lt("expires_at", cutoff)
    .select("id");
  const { data: pending } = await admin
    .from("assessment_attempts")
    .select("id, assessments!inner (type)")
    .in("status", ["submitted", "processing"])
    .eq("assessments.type", "english_oral")
    .limit(20);
  let processed = 0;
  for (const row of pending ?? []) {
    await processOralAttempt(row.id);
    processed += 1;
  }
  return { expired: expired?.length ?? 0, processed };
}

/** Retention: delete assessment audio 12 months after validation (SPEC 15). */
export async function purgeOldAudio(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
  const { data: attempts } = await admin
    .from("assessment_attempts")
    .select("id")
    .eq("status", "validated")
    .lt("validated_at", cutoff)
    .limit(100);
  let removed = 0;
  for (const attempt of attempts ?? []) {
    const { data: answers } = await admin
      .from("assessment_answers")
      .select("id, audio_path")
      .eq("attempt_id", attempt.id)
      .not("audio_path", "is", null);
    const paths = (answers ?? []).map((a) => a.audio_path).filter((p): p is string => Boolean(p));
    if (paths.length === 0) continue;
    await admin.storage.from("assessment-audio").remove(paths);
    await admin
      .from("assessment_answers")
      .update({ audio_path: null })
      .in(
        "id",
        (answers ?? []).map((a) => a.id),
      );
    removed += paths.length;
  }
  return removed;
}
