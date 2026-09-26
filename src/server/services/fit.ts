import "server-only";

import { createHash } from "node:crypto";

import { aiConfigured, completeJson } from "@/lib/ai/anthropic";
import {
  CANDIDATE_FIT_PROMPT_VERSION,
  candidateFitSchema,
  candidateFitSystem,
  candidateFitUser,
  type CandidateFitInput,
} from "@/lib/ai/prompts/candidate-fit";
import { boundFitScore, FIT_ADJUSTMENT_MAX } from "@/lib/fit/bound-score";
import { logger } from "@/lib/logger";
import { extractResumeText } from "@/lib/resume/extract";
import { redactResumeText, stripContactData } from "@/lib/resume/redact";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

export type FitRow = Database["public"]["Tables"]["application_fit"]["Row"];

const MAX_FIT_ATTEMPTS = 3;

/**
 * Fit analysis for one application (Phase 10). Reads the job, the profile, the valid
 * assessment results and the resume, redacts the resume, asks the model for a scored
 * assessment and stores it in application_fit for the hiring company.
 *
 * Never throws: every failure lands in the row as status failed with the reason, so the
 * cron can retry and the company page can say "pending" instead of breaking.
 */
export async function computeApplicationFit(
  applicationId: string,
  options: { force?: boolean } = {},
): Promise<void> {
  const admin = createAdminClient();
  const { data: application } = await admin
    .from("applications")
    .select(
      "id, candidate_id, cover_note, status, created_at, jobs!inner (id, title, role_family, seniority, english_level_required, skills, description, responsibilities, requirements, hours_per_week, timezone_overlap, updated_at, companies (id))",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!application || !application.jobs) return;
  if (application.status === "withdrawn") return;

  const { data: existing } = await admin
    .from("application_fit")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (
    existing &&
    existing.status === "failed" &&
    existing.attempts >= MAX_FIT_ATTEMPTS &&
    !options.force
  ) {
    return;
  }

  if (!aiConfigured()) {
    await admin.from("application_fit").upsert({
      application_id: applicationId,
      status: "skipped",
      last_error: "ai_unavailable",
    });
    return;
  }

  const candidateId = application.candidate_id;
  const [
    { data: candidate },
    { data: experience },
    { data: education },
    { data: contact },
    results,
  ] = await Promise.all([
    admin.from("candidates").select("*").eq("id", candidateId).maybeSingle(),
    admin
      .from("candidate_experience")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("sort_order"),
    admin
      .from("candidate_education")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("end_year", { ascending: false }),
    admin
      .from("candidate_contacts")
      .select("resume_path")
      .eq("candidate_id", candidateId)
      .maybeSingle(),
    admin.rpc("candidate_valid_results", { target_candidate_id: candidateId }),
  ]);
  if (!candidate) return;

  const verified = (
    (results.data ?? []) as {
      type: string;
      final_level: string | null;
      bands: Record<string, string> | null;
    }[]
  ).map((r) => ({ type: r.type, level: r.final_level, bands: r.bands }));

  // Resume: download, extract, redact. A missing or unreadable file is recorded, not fatal.
  let resumeText = "";
  let resumeNote: string | null = null;
  if (contact?.resume_path) {
    const { data: file, error } = await admin.storage.from("resumes").download(contact.resume_path);
    if (error || !file) {
      resumeNote = "resume_download_failed";
    } else {
      try {
        const raw = await extractResumeText(new Uint8Array(await file.arrayBuffer()));
        resumeText = redactResumeText(raw).text;
      } catch (extractError) {
        resumeNote = `resume_unreadable:${(extractError as Error).message.slice(0, 120)}`;
      }
    }
  } else {
    resumeNote = "no_resume";
  }

  const job = application.jobs;
  const inputsHash = createHash("sha256")
    .update(
      JSON.stringify({
        v: CANDIDATE_FIT_PROMPT_VERSION,
        job: job.updated_at,
        candidate: candidate.updated_at,
        resume: resumeText.length,
        verified,
        note: application.cover_note,
      }),
    )
    .digest("hex");
  if (existing?.status === "ready" && existing.inputs_hash === inputsHash && !options.force) return;

  await admin.from("application_fit").upsert({
    application_id: applicationId,
    status: "pending",
    inputs_hash: inputsHash,
    attempts: (existing?.attempts ?? 0) + 1,
    last_error: null,
  });

  const period = (start: string | null, end: string | null, current: boolean) =>
    `${start?.slice(0, 7) ?? "?"} - ${current ? "present" : (end?.slice(0, 7) ?? "?")}`;
  const input: CandidateFitInput = {
    locale: "en",
    job: {
      title: job.title,
      roleFamily: job.role_family,
      seniority: job.seniority,
      englishRequired: job.english_level_required,
      skills: job.skills ?? [],
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      hoursPerWeek: job.hours_per_week,
      timezoneOverlap: job.timezone_overlap,
    },
    candidate: {
      headline: candidate.headline,
      summary: candidate.summary,
      yearsExperience: candidate.years_experience,
      skills: candidate.skills ?? [],
      experience: (experience ?? []).map((e) => ({
        title: e.title,
        company: e.company,
        period: period(e.start_date, e.end_date, e.is_current),
        description: e.description,
      })),
      education: (education ?? []).map((e) => ({
        institution: e.institution,
        degree: e.degree,
        year: e.end_year,
      })),
    },
    verified,
    resumeText,
    coverNote: application.cover_note,
  };

  try {
    const fit = await completeJson(
      candidateFitSchema,
      candidateFitSystem,
      candidateFitUser(input),
      {
        feature: `candidate_fit:${CANDIDATE_FIT_PROMPT_VERSION}`,
        maxTokens: 1200,
      },
    );
    // The stored score is bound to the sub-scores the model reported (audit I11).
    const bounded = boundFitScore(fit.evidence, fit.score);
    if (bounded.drift > FIT_ADJUSTMENT_MAX) {
      logger.warn(
        { applicationId, modelScore: fit.score, baseScore: bounded.base, drift: bounded.drift },
        "fit_score_out_of_bounds",
      );
    }
    const { error } = await admin.from("application_fit").upsert({
      application_id: applicationId,
      status: "ready",
      score: bounded.score,
      summary: stripContactData(fit.summary),
      strengths: fit.strengths.map(stripContactData),
      gaps: fit.gaps.map(stripContactData),
      evidence: {
        ...fit.evidence,
        resume_note: resumeNote,
        model_score: fit.score,
        base_score: bounded.base,
      } as Json,
      model: process.env.ANTHROPIC_MODEL ?? null,
      prompt_version: CANDIDATE_FIT_PROMPT_VERSION,
      inputs_hash: inputsHash,
      computed_at: new Date().toISOString(),
      last_error: null,
    });
    if (error) logger.error({ err: error.message, applicationId }, "fit_store_failed");
  } catch (error) {
    logger.warn({ err: (error as Error).message, applicationId }, "fit_compute_failed");
    await admin.from("application_fit").upsert({
      application_id: applicationId,
      status: "failed",
      last_error: (error as Error).message.slice(0, 400),
    });
  }
}

/** Applications with no ready analysis, oldest first. Used by the cron and the refresh action. */
export async function listApplicationsNeedingFit(jobId?: string, limit = 10): Promise<string[]> {
  const admin = createAdminClient();
  let query = admin
    .from("applications")
    .select("id, created_at, application_fit (status, attempts)")
    .not("status", "in", "(withdrawn,rejected)")
    .order("created_at", { ascending: true })
    .limit(200);
  if (jobId) query = query.eq("job_id", jobId);
  const { data } = await query;
  const pending: string[] = [];
  for (const row of data ?? []) {
    const fit = Array.isArray(row.application_fit) ? row.application_fit[0] : row.application_fit;
    if (!fit || fit.status === "pending") {
      pending.push(row.id);
    } else if (fit.status === "failed" && fit.attempts < MAX_FIT_ATTEMPTS) {
      pending.push(row.id);
    }
    if (pending.length >= limit) break;
  }
  return pending;
}

/** Cron entry: analyses whatever the apply-time hook missed. Sequential to respect rate limits. */
export async function processPendingFit(limit = 10): Promise<{ processed: number }> {
  const ids = await listApplicationsNeedingFit(undefined, limit);
  for (const id of ids) await computeApplicationFit(id);
  return { processed: ids.length };
}

/** Fit rows the current user may see, keyed by application id. RLS decides what comes back. */
export async function listFitForApplications(
  applicationIds: string[],
): Promise<Map<string, FitRow>> {
  if (applicationIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_fit")
    .select("*")
    .in("application_id", applicationIds);
  return new Map((data ?? []).map((row) => [row.application_id, row]));
}
