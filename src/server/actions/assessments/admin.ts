"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { rejectAttemptSchema, validateAttemptSchema } from "@/lib/validation/admin";
import { logAdminActivity } from "@/server/services/admin-activity";
import { processOralAttempt } from "@/server/services/assessments";
import { dispatchEvent } from "@/server/services/events";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Json } from "@/types/database";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Writes final_level, validated_by and validated_at; the sync trigger updates the candidate's levels. */
export async function validateAttempt(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = validateAttemptSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const service = createAdminClient();
  const { data: attempt } = await service
    .from("assessment_attempts")
    .select("id, status, ai_level, ai_result, assessments (type)")
    .eq("id", parsed.data.attempt_id)
    .maybeSingle();
  if (!attempt) return err(ERR.notFound);
  if (!["pending_validation", "ai_scored", "failed", "validated"].includes(attempt.status))
    return err(ERR.conflict);
  const finalLevel = parsed.data.final_level ?? attempt.ai_level;
  if (!finalLevel && attempt.assessments?.type !== "psychometric")
    return err(ERR.validation, { final_level: ["required"] });
  const review = {
    pronunciation: parsed.data.pronunciation ?? null,
    intelligibility: parsed.data.intelligibility ?? null,
    reviewer: admin.id,
  };
  const { error } = await service
    .from("assessment_attempts")
    .update({
      status: "validated",
      final_level: finalLevel ?? null,
      validated_by: admin.id,
      validated_at: new Date().toISOString(),
      validation_comment: parsed.data.comment || null,
      ai_result: {
        ...((attempt.ai_result as Record<string, unknown> | null) ?? {}),
        review,
      } as Json,
    })
    .eq("id", attempt.id);
  if (error) return err(ERR.generic);
  await dispatchEvent({ type: "assessment_result", attemptId: attempt.id, stage: "validated" });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "assessment.validated",
    entityType: "assessment_attempt",
    entityId: attempt.id,
    metadata: { final_level: finalLevel ?? null },
  });
  revalidatePath("/[locale]/admin/assessments", "page");
  return ok(null);
}

/** Bad audio or invalid attempt: mark failed with a comment and waive the cooldown so the candidate can retake. */
export async function rejectAttempt(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = rejectAttemptSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const service = createAdminClient();
  const { error } = await service
    .from("assessment_attempts")
    .update({
      status: "failed",
      cooldown_waived: true,
      validated_by: admin.id,
      validated_at: new Date().toISOString(),
      validation_comment: parsed.data.comment,
    })
    .eq("id", parsed.data.attempt_id);
  if (error) return err(ERR.generic);
  await dispatchEvent({
    type: "assessment_result",
    attemptId: parsed.data.attempt_id,
    stage: "failed",
  });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "assessment.rejected",
    entityType: "assessment_attempt",
    entityId: parsed.data.attempt_id,
    metadata: { comment: parsed.data.comment },
  });
  revalidatePath("/[locale]/admin/assessments", "page");
  return ok(null);
}

export async function retryProcessing(attemptId: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const service = createAdminClient();
  await service
    .from("assessment_attempts")
    .update({ status: "submitted", processing_attempts: 0 })
    .eq("id", attemptId)
    .in("status", ["failed", "processing"]);
  await processOralAttempt(attemptId);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "assessment.retry_processing",
    entityType: "assessment_attempt",
    entityId: attemptId,
  });
  revalidatePath("/[locale]/admin/assessments", "page");
  return ok(null);
}
