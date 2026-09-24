"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAttemptAudioPath } from "@/lib/storage/upload-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ASSESSMENT_TYPES } from "@/lib/validation/enums";
import {
  assignQuestions,
  getAssessmentByType,
  isExpired,
  processOralAttempt,
  scoreDiscAttempt,
  scorePsychometricAttempt,
  scoreWrittenAttempt,
  type AssessmentType,
} from "@/server/services/assessments";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Json } from "@/types/database";

const answerSchema = z.object({
  question_id: z.uuid(),
  selected_option: z.string().max(10).nullable().optional(),
  answer_text: z.string().max(6000).nullable().optional(),
  likert_value: z.number().int().min(1).max(5).nullable().optional(),
});
const answersSchema = z.array(answerSchema).min(1).max(120);
const audioSchema = z.object({
  attempt_id: z.uuid(),
  question_id: z.uuid(),
  path: z.string().min(5).max(300),
  /** Measured by the browser. Accepted for compatibility and ignored: the transcription sets the duration (audit I3). */
  duration_seconds: z.number().min(0).max(600).optional(),
});

async function requireCandidate() {
  const user = await getSessionUser();
  if (!user || user.role !== "candidate") return null;
  return user;
}

export async function startAttempt(type: string): Promise<Result<{ attemptId: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  if (!(ASSESSMENT_TYPES as readonly string[]).includes(type)) return err(ERR.validation);
  const assessment = await getAssessmentByType(type as AssessmentType);
  if (!assessment || !assessment.is_active) return err(ERR.notFound);
  const supabase = await createClient();
  // RLS insert policy plus the attempts_before_insert trigger enforce ownership, cooldown and single open attempt.
  const { data, error } = await supabase
    .from("assessment_attempts")
    .insert({ assessment_id: assessment.id, candidate_id: user.id })
    .select("*")
    .single();
  if (error) {
    if (error.message.includes("attempt_already_open")) {
      const { data: open } = await supabase
        .from("assessment_attempts")
        .select("id")
        .eq("assessment_id", assessment.id)
        .eq("candidate_id", user.id)
        .eq("status", "in_progress")
        .maybeSingle();
      return open ? ok({ attemptId: open.id }) : err(ERR.conflict);
    }
    const cooldown = error.message.match(/cooldown_active:(\S+)/);
    if (cooldown) return err("cooldown", { next_allowed_at: [cooldown[1] ?? ""] });
    logger.warn({ err: error.message }, "attempt_start_failed");
    return err(ERR.generic);
  }
  try {
    await assignQuestions(data, assessment);
  } catch (error) {
    logger.error({ err: (error as Error).message, attemptId: data.id }, "assign_questions_failed");
    await createAdminClient()
      .from("assessment_attempts")
      .update({ status: "expired" })
      .eq("id", data.id);
    return err(ERR.generic);
  }
  revalidatePath("/[locale]/candidate/assessments", "page");
  return ok({ attemptId: data.id });
}

export async function saveAssessmentAnswers(
  attemptId: string,
  input: unknown,
): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const supabase = await createClient();
  const rows = parsed.data.map((a) => ({
    attempt_id: attemptId,
    question_id: a.question_id,
    selected_option: a.selected_option ?? null,
    answer_text: a.answer_text ?? null,
    likert_value: a.likert_value ?? null,
  }));
  const { error } = await supabase
    .from("assessment_answers")
    .upsert(rows, { onConflict: "attempt_id,question_id" });
  if (error) {
    // RLS denies once the attempt is no longer open (expired or submitted).
    return err(error.code === "42501" ? "attemptClosed" : ERR.generic);
  }
  return ok(null);
}

export async function recordTabLeave(attemptId: string): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("id, integrity, status")
    .eq("id", attemptId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!attempt || attempt.status !== "in_progress") return err(ERR.conflict);
  const integrity =
    (attempt.integrity as { tab_leaves?: number; submitted_after_expiry?: boolean } | null) ?? {};
  await admin
    .from("assessment_attempts")
    .update({ integrity: { ...integrity, tab_leaves: (integrity.tab_leaves ?? 0) + 1 } as Json })
    .eq("id", attemptId);
  return ok(null);
}

/**
 * Records an uploaded answer recording. Runs with the service role after checking, explicitly,
 * that the attempt is the caller's, still open, and asks this question, and that the path has
 * the shape the upload route signs under this attempt (audit I3, I9). The database guard
 * enforces the same rules for any other writer; the duration is left for the transcription.
 */
export async function confirmAudioUpload(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = audioSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  if (!isAttemptAudioPath(parsed.data.attempt_id, parsed.data.path)) return err(ERR.forbidden);
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("*")
    .eq("id", parsed.data.attempt_id)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!attempt) return err(ERR.notFound);
  if (attempt.status !== "in_progress" || isExpired(attempt)) return err("attemptClosed");
  if (!attempt.question_ids.includes(parsed.data.question_id)) return err(ERR.validation);
  const { error } = await admin.from("assessment_answers").upsert(
    {
      attempt_id: parsed.data.attempt_id,
      question_id: parsed.data.question_id,
      audio_path: parsed.data.path,
      audio_duration_seconds: null,
      transcript: null,
      ai_feedback: null,
    },
    { onConflict: "attempt_id,question_id" },
  );
  if (error) {
    logger.warn({ err: error.message, attemptId: attempt.id }, "audio_confirm_failed");
    return err(ERR.generic);
  }
  return ok(null);
}

export async function submitAttempt(attemptId: string): Promise<Result<{ status: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("*, assessments (*)")
    .eq("id", attemptId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!attempt || !attempt.assessments) return err(ERR.notFound);
  if (attempt.status !== "in_progress") return err(ERR.conflict);
  const assessment = attempt.assessments;
  const expired = isExpired(attempt);
  const integrity = {
    ...((attempt.integrity as Record<string, unknown> | null) ?? {}),
    submitted_after_expiry: expired,
  } as Json;
  const { data: updated, error } = await admin
    .from("assessment_attempts")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), integrity })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("*")
    .single();
  if (error || !updated) return err(ERR.generic);

  const locale = user.profile?.locale ?? "en";
  if (assessment.type === "english_written") {
    await scoreWrittenAttempt(updated, assessment, locale);
  } else if (assessment.type === "psychometric") {
    await scorePsychometricAttempt(updated, assessment);
  } else if (assessment.type === "disc") {
    await scoreDiscAttempt(updated, assessment);
  } else {
    // Oral: transcription and grading run in the background and via the cron.
    after(async () => {
      try {
        await processOralAttempt(attemptId);
      } catch (error) {
        logger.error({ err: (error as Error).message, attemptId }, "oral_after_failed");
      }
    });
  }
  const { data: final } = await admin
    .from("assessment_attempts")
    .select("status")
    .eq("id", attemptId)
    .single();
  revalidatePath("/[locale]/candidate", "layout");
  return ok({ status: final?.status ?? "submitted" });
}

export async function getAudioPlaybackUrl(
  attemptId: string,
  questionId: string,
): Promise<Result<{ url: string }>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("candidate_id")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return err(ERR.notFound);
  if (user.role !== "admin" && attempt.candidate_id !== user.id) return err(ERR.forbidden);
  const { data: answer } = await admin
    .from("assessment_answers")
    .select("audio_path")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (!answer?.audio_path) return err(ERR.notFound);
  const { data, error } = await admin.storage
    .from("assessment-audio")
    .createSignedUrl(answer.audio_path, 600);
  if (error || !data) return err(ERR.generic);
  return ok({ url: data.signedUrl });
}
