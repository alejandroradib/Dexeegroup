"use server";

import { revalidatePath } from "next/cache";

import { aiConfigured, completeJson } from "@/lib/ai/anthropic";
import {
  JOB_DRAFT_PROMPT_VERSION,
  jobDraftSchema,
  jobDraftSystem,
  jobDraftUser,
} from "@/lib/ai/prompts/job-draft";
import { getSessionUser } from "@/lib/auth/session";
import { inviteExpiryFrom } from "@/lib/invites";
import {
  diffMaterialTerms,
  snapshotMaterialTerms,
  type MaterialTerms,
} from "@/lib/jobs/material-terms";
import { logger } from "@/lib/logger";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { AI_LIMITS } from "@/lib/rate-limit-policies";
import { isCandidateResumePath } from "@/lib/storage/upload-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  companyDetailsSchema,
  companyNoteSchema,
  companyOnboardingSchema,
  hiringNeedsSchema,
  jobDraftPatchSchema,
  jobDraftRequestSchema,
  jobFullSchema,
  notificationPrefsSchema,
  teamInviteSchema,
} from "@/lib/validation/company";
import { APPLICATION_STATUSES } from "@/lib/validation/enums";
import { getCurrentCompany } from "@/server/services/companies";
import { dispatchEvent } from "@/server/services/events";
import { computeApplicationFit, listApplicationsNeedingFit } from "@/server/services/fit";
import { pingJobIndexing } from "@/server/services/indexing";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Database, Json } from "@/types/database";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

async function requireCompanyUser() {
  const user = await getSessionUser();
  if (!user || user.role !== "company") return null;
  return user;
}

function fieldErrors(error: { flatten: () => { fieldErrors: unknown } }) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Onboarding and company profile
// ---------------------------------------------------------------------------

export async function completeCompanyOnboarding(
  input: unknown,
): Promise<Result<{ companyId: string }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = companyOnboardingSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const existing = await getCurrentCompany();
  const details = parsed.data.details;
  const payload = {
    name: details.name,
    legal_name: details.legal_name || null,
    website: details.website || null,
    sector: details.sector ?? null,
    country: details.country,
    state: details.state || null,
    city: details.city || null,
    size: details.size ?? null,
    description: details.description || null,
    hiring_needs: parsed.data.hiring_needs as unknown as Json,
  };
  if (existing) {
    const { error } = await supabase.from("companies").update(payload).eq("id", existing.id);
    if (error) return err(ERR.generic);
    revalidatePath("/", "layout");
    return ok({ companyId: existing.id });
  }
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...payload, owner_user_id: user.id })
    .select("id")
    .single();
  if (error) {
    logger.error({ err: error.message }, "company_insert_failed");
    return err(ERR.generic);
  }
  await dispatchEvent({ type: "company_status", companyId: data.id, status: "pending" });
  revalidatePath("/", "layout");
  return ok({ companyId: data.id });
}

export async function updateCompanyProfile(input: unknown): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  const parsed = companyDetailsSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: d.name,
      legal_name: d.legal_name || null,
      website: d.website || null,
      sector: d.sector ?? null,
      country: d.country,
      state: d.state || null,
      city: d.city || null,
      size: d.size ?? null,
      description: d.description || null,
    })
    .eq("id", company.id);
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company", "layout");
  return ok(null);
}

export async function updateHiringNeeds(input: unknown): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  const parsed = hiringNeedsSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ hiring_needs: parsed.data as unknown as Json })
    .eq("id", company.id);
  return error ? err(ERR.generic) : ok(null);
}

export async function setCompanyLogo(path: string): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  if (!path.startsWith(`companies/${company.id}/`)) return err(ERR.forbidden);
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ logo_path: path })
    .eq("id", company.id);
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company", "layout");
  return ok(null);
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function createDraftJob(title?: string): Promise<Result<{ jobId: string }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  if (company.status === "suspended") return err(ERR.forbidden);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      company_id: company.id,
      title: title?.trim() || "Untitled role",
      created_by: user.id,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company/jobs", "page");
  return ok({ jobId: data.id });
}

/** States in which a company may edit a job's content. Mirrored by the jobs_before_write trigger. */
const EDITABLE_JOB_STATES: Database["public"]["Enums"]["job_status"][] = [
  "draft",
  "changes_requested",
];

/**
 * Autosave: accepts any subset of the wizard fields. Only drafts and changes_requested jobs
 * can be edited; a published, paused, closed or pending job has to be withdrawn to draft
 * first (changeJobStatus "reopen"). The trigger enforces the same rule for direct writes.
 */
export async function patchJobDraft(jobId: string, input: unknown): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = jobDraftPatchSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return err(ERR.notFound);
  if (!EDITABLE_JOB_STATES.includes(job.status)) return err("jobLocked");
  const update: Database["public"]["Tables"]["jobs"]["Update"] = { ...parsed.data };
  if (parsed.data.title && parsed.data.title.trim() === "") delete update.title;
  const { error } = await supabase.from("jobs").update(update).eq("id", jobId);
  if (error) {
    if (error.message.includes("job_locked_for_edit")) return err("jobLocked");
    logger.warn({ err: error.message, jobId }, "job_patch_failed");
    return err(ERR.generic);
  }
  return ok(null);
}

/** Submit: publishes when the company is verified, otherwise queues for review. */
export async function submitJob(
  jobId: string,
): Promise<Result<{ status: Database["public"]["Enums"]["job_status"] }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  if (company.status === "suspended") return err(ERR.forbidden);
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return err(ERR.notFound);
  const candidate = Object.fromEntries(
    Object.entries(job).map(([k, v]) => [k, v === null ? undefined : v]),
  );
  const validation = jobFullSchema.safeParse(candidate);
  if (!validation.success) return err(ERR.validation, fieldErrors(validation.error));

  const status = company.status === "verified" ? "published" : "pending_review";
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) {
    logger.warn({ err: error.message, jobId }, "job_submit_failed");
    return err(error.message.includes("company_not_verified") ? "companyNotVerified" : ERR.generic);
  }
  // Applicants in the running are told when the terms they applied to changed (decision 71).
  if (job.reopen_snapshot) {
    const changes = diffMaterialTerms(
      job.reopen_snapshot as unknown as MaterialTerms,
      snapshotMaterialTerms(job),
    );
    if (changes.length > 0) await dispatchEvent({ type: "job_terms_changed", jobId, changes });
    await clearReopenSnapshot(jobId);
  }
  if (status === "published") {
    await dispatchEvent({ type: "job_status", jobId, status: "published" });
    await pingJobIndexing(jobId, "URL_UPDATED");
  }
  revalidatePath("/[locale]/company/jobs", "page");
  revalidatePath("/[locale]/jobs", "page");
  return ok({ status });
}

/** Per-user and per-company ceilings on model calls (audit I13); true when either is spent. */
async function aiCallLimited(
  feature: keyof typeof AI_LIMITS,
  userId: string,
  companyId: string,
): Promise<boolean> {
  const policy = AI_LIMITS[feature];
  const [perUser, perCompany] = await Promise.all([
    rateLimit(`${feature}:user`, hashIdentifier(userId), policy.user),
    rateLimit(`${feature}:company`, hashIdentifier(companyId), policy.company),
  ]);
  return !perUser.success || !perCompany.success;
}

/**
 * Computes the missing fit analyses for one of the company's jobs, a few at a time, so the
 * recommended panel fills in without waiting for the daily cron.
 */
export async function refreshJobFit(jobId: string): Promise<Result<{ computed: number }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  if (await aiCallLimited("job_fit", user.id, company.id)) return err(ERR.rateLimited);
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!job) return err(ERR.notFound);
  const ids = await listApplicationsNeedingFit(jobId, 5);
  for (const id of ids) await computeApplicationFit(id);
  revalidatePath("/[locale]/company/jobs/[id]/pipeline", "page");
  return ok({ computed: ids.length });
}

/**
 * Status transitions a company may make. "reopen" withdraws a live, paused or pending job to
 * draft so its content can be edited again; the public page and the Google index entry go
 * away until it is resubmitted through submitJob, which applies the same publish gate as the
 * first time (decision 59).
 */
/**
 * Clears the snapshot once the applicants have been told. Runs with the service role: the
 * trigger keeps a company's own client from changing the column (audit G4), so a user-client
 * update here would be silently ignored and the notice would repeat on every resubmission.
 */
async function clearReopenSnapshot(jobId: string) {
  const { error } = await createAdminClient()
    .from("jobs")
    .update({ reopen_snapshot: null })
    .eq("id", jobId);
  if (error) logger.warn({ err: error.message, jobId }, "reopen_snapshot_clear_failed");
}

export async function changeJobStatus(
  jobId: string,
  action: "pause" | "resume" | "close" | "reopen",
): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return err(ERR.notFound);
  const next: Record<typeof action, Database["public"]["Enums"]["job_status"] | null> = {
    pause: job.status === "published" ? "paused" : null,
    resume: job.status === "paused" ? "published" : null,
    close: job.status !== "closed" ? "closed" : null,
    reopen: ["published", "paused", "pending_review"].includes(job.status) ? "draft" : null,
  };
  const status = next[action];
  if (!status) return err(ERR.conflict);
  // Withdrawing to draft: the database trigger snapshots the material terms while there are
  // applicants in the running (decision 71, audit G4), so submitJob can tell them what changed.
  // The company's client cannot write that column, on purpose.
  const { error } = await supabase
    .from("jobs")
    .update({ status, ...(status === "closed" ? { closes_at: new Date().toISOString() } : {}) })
    .eq("id", jobId);
  if (error)
    return err(error.message.includes("company_not_verified") ? "companyNotVerified" : ERR.generic);
  await pingJobIndexing(jobId, status === "published" ? "URL_UPDATED" : "URL_DELETED");
  revalidatePath("/[locale]/company/jobs", "page");
  revalidatePath(`/[locale]/company/jobs/${jobId}/edit`, "page");
  revalidatePath("/[locale]/jobs", "page");
  return ok(null);
}

export async function duplicateJob(jobId: string): Promise<Result<{ jobId: string }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return err(ERR.notFound);
  const {
    id: _id,
    slug: _slug,
    status: _status,
    published_at: _p,
    closes_at: _c,
    review_message: _r,
    created_at: _ca,
    updated_at: _ua,
    ...rest
  } = job;
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...rest, title: `${job.title} (copy)`, status: "draft", created_by: user.id })
    .select("id")
    .single();
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company/jobs", "page");
  return ok({ jobId: data.id });
}

export async function deleteDraftJob(jobId: string): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .in("status", ["draft", "closed"]);
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company/jobs", "page");
  return ok(null);
}

export async function draftJobWithAi(
  input: unknown,
): Promise<Result<{ description: string; responsibilities: string; requirements: string }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = jobDraftRequestSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  if (!aiConfigured()) return err("aiUnavailable");
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  if (await aiCallLimited("job_draft", user.id, company.id)) return err(ERR.rateLimited);
  try {
    const draft = await completeJson(
      jobDraftSchema,
      jobDraftSystem,
      jobDraftUser({
        title: parsed.data.title,
        seniority: parsed.data.seniority,
        roleFamily: parsed.data.role_family,
        keywords: parsed.data.keywords,
      }),
      {
        feature: `job_draft:${JOB_DRAFT_PROMPT_VERSION}`,
        actorUserId: user.id,
        maxTokens: 1500,
      },
    );
    return ok(draft);
  } catch (error) {
    logger.error({ err: (error as Error).message }, "job_draft_failed");
    return err("aiFailed");
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function moveApplication(
  applicationId: string,
  status: ApplicationStatus,
): Promise<Result<{ status: ApplicationStatus }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  if (!APPLICATION_STATUSES.includes(status) || status === "withdrawn") return err(ERR.validation);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("id, status")
    .maybeSingle();
  if (error || !data) {
    logger.warn({ err: error?.message, applicationId }, "application_move_failed");
    return err(ERR.generic);
  }
  await dispatchEvent({ type: "application_status", applicationId, status });
  if (status === "hired") await dispatchEvent({ type: "placement_pending", applicationId });
  return ok({ status: data.status });
}

export async function requestContactDetails(applicationId: string): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ contact_requested_at: new Date().toISOString() })
    .eq("id", applicationId)
    .is("contact_requested_at", null)
    .select("id")
    .maybeSingle();
  if (error) return err(ERR.generic);
  if (!data) return err(ERR.conflict);
  await dispatchEvent({ type: "contact_requested", applicationId });
  return ok(null);
}

export async function toggleSavedCandidate(
  candidateId: string,
  save: boolean,
): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  const supabase = await createClient();
  const { error } = save
    ? await supabase
        .from("saved_candidates")
        .upsert({ company_id: company.id, candidate_id: candidateId, created_by: user.id })
    : await supabase
        .from("saved_candidates")
        .delete()
        .eq("company_id", company.id)
        .eq("candidate_id", candidateId);
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company/shortlist", "page");
  return ok(null);
}

export async function addCompanyNote(input: unknown): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = companyNoteSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("candidate_id")
    .eq("id", parsed.data.application_id)
    .maybeSingle();
  if (!application) return err(ERR.notFound);
  const { error } = await supabase.from("notes").insert({
    application_id: parsed.data.application_id,
    candidate_id: application.candidate_id,
    author_user_id: user.id,
    body: parsed.data.body,
    visibility: "company",
  });
  return error ? err(ERR.generic) : ok(null);
}

// ---------------------------------------------------------------------------
// Team and settings
// ---------------------------------------------------------------------------

export async function inviteTeamMember(input: unknown): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const company = await getCurrentCompany();
  if (!company) return err(ERR.notFound);
  if (company.owner_user_id !== user.id) return err(ERR.forbidden);
  const parsed = teamInviteSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .insert({
      company_id: company.id,
      invited_email: parsed.data.email.toLowerCase(),
      invite_token: token,
      invite_expires_at: inviteExpiryFrom(),
      invited_by: user.id,
      role: "member",
    })
    .select("id")
    .single();
  if (error) return err(ERR.generic);
  await dispatchEvent({ type: "team_invite", memberId: data.id, token });
  revalidatePath("/[locale]/company/settings", "page");
  return ok(null);
}

export async function removeTeamMember(memberId: string): Promise<Result<null>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", memberId)
    .eq("role", "member");
  if (error) return err(ERR.generic);
  revalidatePath("/[locale]/company/settings", "page");
  return ok(null);
}

export async function updateNotificationPrefs(input: unknown): Promise<Result<null>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = notificationPrefsSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: parsed.data as unknown as Json })
    .eq("id", user.id);
  return error ? err(ERR.generic) : ok(null);
}

/** Company users read the resume only after release; the server signs a 10-minute URL. */
export async function getApplicantResumeUrl(
  applicationId: string,
): Promise<Result<{ url: string }>> {
  const user = await requireCompanyUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("candidate_id, contact_released")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return err(ERR.notFound);
  if (!application.contact_released) return err(ERR.forbidden);
  const { data: contact } = await supabase
    .from("candidate_contacts")
    .select("resume_path")
    .eq("candidate_id", application.candidate_id)
    .maybeSingle();
  if (!contact?.resume_path) return err(ERR.notFound);
  // The path is built from the application's candidate, never read back from the stored value
  // (audit I8): a candidate cannot steer a company to another candidate's file.
  const path = `candidates/${application.candidate_id}/resume.pdf`;
  if (!isCandidateResumePath(application.candidate_id, contact.resume_path)) {
    logger.warn({ applicationId, candidateId: application.candidate_id }, "resume_path_mismatch");
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("resumes").createSignedUrl(path, 600);
  if (error || !data) return err(ERR.notFound);
  return ok({ url: data.signedUrl });
}
