"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { aiConfigured, completeJson } from "@/lib/ai/anthropic";
import {
  interviewReportSchema,
  MOCK_INTERVIEW_PROMPT_VERSION,
  mockInterviewSystem,
  mockInterviewUser,
} from "@/lib/ai/prompts/mock-interview";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildInterviewQuestions,
  INTERVIEW_QUESTION_COUNT,
  type InterviewQuestion,
} from "@/lib/interview/questions";
import { normalizeReport } from "@/lib/interview/scoring";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ROLE_FAMILIES } from "@/lib/validation/enums";
import { getInterviewOverview } from "@/server/services/interviews";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Json } from "@/types/database";

const startSchema = z.object({
  role_family: z.enum(ROLE_FAMILIES),
  language: z.enum(["en", "es"]),
});
const answerSchema = z.object({
  question_id: z.string().min(1).max(10),
  text: z.string().max(4000),
});

async function requireCandidate() {
  const user = await getSessionUser();
  if (!user || user.role !== "candidate") return null;
  return user;
}

export async function startInterview(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const overview = await getInterviewOverview(user.id);
  if (overview.open) return ok({ id: overview.open.id });
  if (overview.nextAllowedAt) return err("cooldown", { next_allowed_at: [overview.nextAllowedAt] });
  const questions = buildInterviewQuestions(parsed.data.role_family, parsed.data.language);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_interviews")
    .insert({
      candidate_id: user.id,
      role_family: parsed.data.role_family,
      language: parsed.data.language,
      questions: questions as unknown as Json,
    })
    .select("id")
    .single();
  if (error) {
    logger.warn({ err: error.message }, "interview_start_failed");
    return err(ERR.generic);
  }
  revalidatePath("/[locale]/candidate", "layout");
  return ok({ id: data.id });
}

export async function saveInterviewAnswer(
  interviewId: string,
  input: unknown,
): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("mock_interviews")
    .select("answers, status")
    .eq("id", interviewId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!row) return err(ERR.notFound);
  if (row.status !== "in_progress") return err("interviewClosed");
  const answers = {
    ...((row.answers as Record<string, string> | null) ?? {}),
    [parsed.data.question_id]: parsed.data.text,
  };
  const { error } = await supabase
    .from("mock_interviews")
    .update({ answers: answers as Json })
    .eq("id", interviewId)
    .eq("candidate_id", user.id);
  return error ? err(ERR.generic) : ok(null);
}

export async function submitInterview(interviewId: string): Promise<Result<{ status: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mock_interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!row) return err(ERR.notFound);
  if (row.status !== "in_progress") return err("interviewClosed");
  const questions = (row.questions as unknown as InterviewQuestion[]) ?? [];
  const answers = (row.answers as Record<string, string> | null) ?? {};
  const answered = questions.filter((q) => (answers[q.id] ?? "").trim().length > 0).length;
  if (answered < Math.min(INTERVIEW_QUESTION_COUNT, questions.length)) return err("incomplete");

  if (!aiConfigured()) {
    await admin
      .from("mock_interviews")
      .update({ status: "failed", processing_attempts: row.processing_attempts + 1 })
      .eq("id", interviewId);
    return err("aiUnavailable");
  }
  try {
    const report = normalizeReport(
      await completeJson(
        interviewReportSchema,
        mockInterviewSystem,
        mockInterviewUser({
          roleFamily: row.role_family,
          locale: row.language,
          qa: questions.map((q) => ({ id: q.id, question: q.text, answer: answers[q.id] ?? "" })),
        }),
        {
          feature: `mock_interview:${MOCK_INTERVIEW_PROMPT_VERSION}`,
          actorUserId: user.id,
          maxTokens: 1500,
        },
      ),
    );
    await admin
      .from("mock_interviews")
      .update({
        status: "completed",
        report: report as unknown as Json,
        overall_score: report.overall,
        completed_at: new Date().toISOString(),
        processing_attempts: row.processing_attempts + 1,
      })
      .eq("id", interviewId);
    revalidatePath("/[locale]/candidate", "layout");
    return ok({ status: "completed" });
  } catch (error) {
    logger.error({ err: (error as Error).message, interviewId }, "interview_grade_failed");
    await admin
      .from("mock_interviews")
      .update({ status: "failed", processing_attempts: row.processing_attempts + 1 })
      .eq("id", interviewId);
    return err("aiFailed");
  }
}

/** Failed interviews can be retried by the candidate: the report is regenerated from the saved answers. */
export async function retryInterview(interviewId: string): Promise<Result<{ status: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mock_interviews")
    .select("id, status, processing_attempts")
    .eq("id", interviewId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!row || row.status !== "failed" || row.processing_attempts >= 3) return err(ERR.conflict);
  await admin.from("mock_interviews").update({ status: "in_progress" }).eq("id", interviewId);
  return submitInterview(interviewId);
}
