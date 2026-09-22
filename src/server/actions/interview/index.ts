"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { aiConfigured, completeJson, completeJsonChat } from "@/lib/ai/anthropic";
import {
  INTERVIEWER_PROMPT_VERSION,
  interviewerMessages,
  interviewerSystem,
  interviewerTurnSchema,
  type InterviewJobContext,
} from "@/lib/ai/prompts/interviewer";
import {
  interviewReportSchema,
  MOCK_INTERVIEW_PROMPT_VERSION,
  mockInterviewSystem,
  mockInterviewTranscriptUser,
  mockInterviewUser,
} from "@/lib/ai/prompts/mock-interview";
import { getSessionUser } from "@/lib/auth/session";
import {
  awaitingCandidate,
  canFinish,
  candidateTurns,
  INTERVIEW_MAX_CANDIDATE_TURNS,
  INTERVIEW_MESSAGE_MAX_CHARS,
  INTERVIEW_RATE_LIMIT,
  interviewLanguageForJob,
  parseTranscript,
  type InterviewTurn,
} from "@/lib/interview/conversation";
import { type InterviewQuestion } from "@/lib/interview/questions";
import { normalizeReport } from "@/lib/interview/scoring";
import { logger } from "@/lib/logger";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ROLE_FAMILIES } from "@/lib/validation/enums";
import {
  getInterviewJobContext,
  getInterviewOverview,
  listInterviewJobOptions,
  type MockInterview,
} from "@/server/services/interviews";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Json } from "@/types/database";

const startSchema = z.union([
  z.object({ job_id: z.string().uuid() }),
  z.object({ role_family: z.enum(ROLE_FAMILIES), language: z.enum(["en", "es"]) }),
]);
const messageSchema = z.object({
  text: z.string().trim().min(1).max(INTERVIEW_MESSAGE_MAX_CHARS),
});

async function requireCandidate() {
  const user = await getSessionUser();
  if (!user || user.role !== "candidate") return null;
  return user;
}

function now(): string {
  return new Date().toISOString();
}

async function jobContextFor(job_id: string | null): Promise<InterviewJobContext | null> {
  if (!job_id) return null;
  const ctx = await getInterviewJobContext(job_id);
  return ctx
    ? {
        title: ctx.title,
        companyName: ctx.companyName,
        seniority: ctx.seniority,
        description: ctx.description,
        responsibilities: ctx.responsibilities,
        requirements: ctx.requirements,
        skills: ctx.skills,
        englishLevelRequired: ctx.englishLevelRequired,
      }
    : null;
}

/** Asks the interviewer for its next turn given the transcript so far. */
async function nextInterviewerTurn(
  row: Pick<MockInterview, "id" | "job_id" | "role_family" | "language">,
  transcript: InterviewTurn[],
  actorUserId: string,
) {
  const job = await jobContextFor(row.job_id);
  return completeJsonChat(
    interviewerTurnSchema,
    interviewerSystem({
      language: row.language,
      roleFamily: row.role_family,
      job,
      maxCandidateTurns: INTERVIEW_MAX_CANDIDATE_TURNS,
    }),
    interviewerMessages(transcript),
    {
      feature: `interviewer:${INTERVIEWER_PROMPT_VERSION}`,
      actorUserId,
      maxTokens: 600,
      temperature: 0.4,
    },
  );
}

/**
 * Opens an interview. Tied to a job the candidate can see (language derived from the job's
 * English requirement) or generic by role family. The interviewer's opening turn is
 * generated here so the candidate lands in a conversation that has already started.
 */
export async function startInterview(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const overview = await getInterviewOverview(user.id);
  if (overview.open) return ok({ id: overview.open.id });
  if (overview.nextAllowedAt) return err("cooldown", { next_allowed_at: [overview.nextAllowedAt] });
  if (!aiConfigured()) return err("aiUnavailable");

  let job_id: string | null = null;
  let role_family: (typeof ROLE_FAMILIES)[number] = "other";
  let language: "en" | "es";
  if ("job_id" in parsed.data) {
    const requested = parsed.data.job_id;
    // The option list is built through the candidate's client, so RLS decides visibility.
    const options = await listInterviewJobOptions(user.id, requested);
    if (!options.some((o) => o.id === requested)) return err(ERR.notFound);
    const ctx = await getInterviewJobContext(requested);
    if (!ctx) return err(ERR.notFound);
    job_id = requested;
    role_family = ctx.roleFamily ?? "other";
    language = interviewLanguageForJob({ english_level_required: ctx.englishLevel });
  } else {
    role_family = parsed.data.role_family;
    language = parsed.data.language;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mock_interviews")
    .insert({ candidate_id: user.id, role_family, language, job_id, questions: [] })
    .select("id, job_id, role_family, language")
    .single();
  if (error) {
    logger.warn({ err: error.message }, "interview_start_failed");
    return err(ERR.generic);
  }
  try {
    const opening = await nextInterviewerTurn(data, [], user.id);
    const transcript: InterviewTurn[] = [{ role: "interviewer", text: opening.message, at: now() }];
    await createAdminClient()
      .from("mock_interviews")
      .update({ transcript: transcript as unknown as Json })
      .eq("id", data.id);
  } catch (error) {
    logger.error({ err: (error as Error).message, interviewId: data.id }, "interview_open_failed");
    // Leave the row open with an empty transcript; the chat asks the interviewer again.
  }
  revalidatePath("/[locale]/candidate", "layout");
  return ok({ id: data.id });
}

/**
 * Appends the candidate's reply and returns the interviewer's next turn. The transcript is
 * written with the service role: the candidate's own client cannot touch it (trigger), so an
 * interviewer turn can only come from here.
 */
export async function sendInterviewMessage(
  interviewId: string,
  input: unknown,
): Promise<Result<{ transcript: InterviewTurn[]; done: boolean }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const limit = await rateLimit("interview_message", hashIdentifier(user.id), INTERVIEW_RATE_LIMIT);
  if (!limit.success) return err(ERR.rateLimited);
  if (!aiConfigured()) return err("aiUnavailable");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mock_interviews")
    .select("id, job_id, role_family, language, status, transcript, candidate_turns, expires_at")
    .eq("id", interviewId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!row) return err(ERR.notFound);
  if (row.status !== "in_progress") return err("interviewClosed");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("mock_interviews").update({ status: "expired" }).eq("id", interviewId);
    return err("interviewClosed");
  }
  const transcript = parseTranscript(row.transcript);
  if (transcript.length > 0 && !awaitingCandidate(transcript)) return err(ERR.conflict);
  if (candidateTurns(transcript) >= INTERVIEW_MAX_CANDIDATE_TURNS) return err("turnsExhausted");

  const withReply: InterviewTurn[] =
    transcript.length === 0
      ? transcript // No opening yet (the first call failed): ask the interviewer to open.
      : [...transcript, { role: "candidate", text: parsed.data.text, at: now() }];
  try {
    const turn = await nextInterviewerTurn(row, withReply, user.id);
    const next: InterviewTurn[] = [
      ...withReply,
      { role: "interviewer", text: turn.message, at: now() },
    ];
    const done = turn.done || candidateTurns(next) >= INTERVIEW_MAX_CANDIDATE_TURNS;
    const { error } = await admin
      .from("mock_interviews")
      .update({
        transcript: next as unknown as Json,
        candidate_turns: candidateTurns(next),
      })
      .eq("id", interviewId)
      .eq("candidate_turns", row.candidate_turns); // optimistic: a double send loses
    if (error) return err(ERR.generic);
    return ok({ transcript: next, done });
  } catch (error) {
    logger.error({ err: (error as Error).message, interviewId }, "interview_turn_failed");
    return err("aiFailed");
  }
}

/** Closes the conversation and grades the transcript. Feedback is in the candidate's UI language. */
export async function finishInterview(interviewId: string): Promise<Result<{ status: string }>> {
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
  const transcript = parseTranscript(row.transcript);
  if (!canFinish(transcript)) return err("incomplete");
  return gradeTranscript(row, transcript, user.id);
}

async function gradeTranscript(
  row: MockInterview,
  transcript: InterviewTurn[],
  actorUserId: string,
): Promise<Result<{ status: string }>> {
  const admin = createAdminClient();
  if (!aiConfigured()) {
    await admin
      .from("mock_interviews")
      .update({ status: "failed", processing_attempts: row.processing_attempts + 1 })
      .eq("id", row.id);
    return err("aiUnavailable");
  }
  const locale = (await getLocale()) === "es" ? "es" : "en";
  try {
    const job = row.job_id ? await getInterviewJobContext(row.job_id) : null;
    const report = normalizeReport(
      await completeJson(
        interviewReportSchema,
        mockInterviewSystem,
        mockInterviewTranscriptUser({
          roleFamily: row.role_family,
          jobTitle: job?.title ?? null,
          interviewLanguage: row.language,
          feedbackLocale: locale,
          transcript,
        }),
        {
          feature: `mock_interview:${MOCK_INTERVIEW_PROMPT_VERSION}`,
          actorUserId,
          maxTokens: 2000,
        },
      ),
    );
    await admin
      .from("mock_interviews")
      .update({
        status: "completed",
        report: report as unknown as Json,
        overall_score: report.overall,
        completed_at: now(),
        processing_attempts: row.processing_attempts + 1,
      })
      .eq("id", row.id);
    revalidatePath("/[locale]/candidate", "layout");
    return ok({ status: "completed" });
  } catch (error) {
    logger.error({ err: (error as Error).message, interviewId: row.id }, "interview_grade_failed");
    await admin
      .from("mock_interviews")
      .update({ status: "failed", processing_attempts: row.processing_attempts + 1 })
      .eq("id", row.id);
    return err("aiFailed");
  }
}

/** Grades a legacy six-question interview (rows created before the conversation runner). */
async function gradeLegacy(
  row: MockInterview,
  actorUserId: string,
): Promise<Result<{ status: string }>> {
  const questions = (row.questions as unknown as InterviewQuestion[]) ?? [];
  const answers = (row.answers as Record<string, string> | null) ?? {};
  const admin = createAdminClient();
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
          actorUserId,
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
        completed_at: now(),
        processing_attempts: row.processing_attempts + 1,
      })
      .eq("id", row.id);
    return ok({ status: "completed" });
  } catch (error) {
    logger.error({ err: (error as Error).message, interviewId: row.id }, "interview_grade_failed");
    await admin
      .from("mock_interviews")
      .update({ status: "failed", processing_attempts: row.processing_attempts + 1 })
      .eq("id", row.id);
    return err("aiFailed");
  }
}

/** Failed interviews can be retried by the candidate: the report is regenerated from the saved transcript. */
export async function retryInterview(interviewId: string): Promise<Result<{ status: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("mock_interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("candidate_id", user.id)
    .maybeSingle();
  if (!row || row.status !== "failed" || row.processing_attempts >= 3) return err(ERR.conflict);
  const transcript = parseTranscript(row.transcript);
  if (transcript.length > 0) return gradeTranscript(row, transcript, user.id);
  return gradeLegacy(row, user.id);
}
