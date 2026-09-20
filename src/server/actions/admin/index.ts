"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { notifyJobIndexed } from "@/lib/seo/indexing-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  adminInviteSchema,
  applicationStatusSchema,
  assessmentConfigSchema,
  candidateTagsSchema,
  commercialsSchema,
  dexeeNoteSchema,
  endPlacementSchema,
  placementSchema,
  recommendSchema,
  requestChangesSchema,
  verifyCompanySchema,
} from "@/lib/validation/admin";
import { logAdminActivity } from "@/server/services/admin-activity";
import { dispatchEvent } from "@/server/services/events";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Database, Json } from "@/types/database";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

function fieldErrors(error: { flatten: () => { fieldErrors: unknown } }) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function revalidateAdmin() {
  revalidatePath("/[locale]/admin", "layout");
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function verifyCompany(input: unknown): Promise<Result<{ published: number }>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = verifyCompanySchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ status: "verified", verified_at: new Date().toISOString(), verified_by: admin.id })
    .eq("id", parsed.data.company_id);
  if (error) return err(ERR.generic);
  let published = 0;
  if (parsed.data.publish_job_ids.length > 0) {
    const { data } = await supabase
      .from("jobs")
      .update({ status: "published" })
      .in("id", parsed.data.publish_job_ids)
      .eq("company_id", parsed.data.company_id)
      .eq("status", "pending_review")
      .select("id");
    published = data?.length ?? 0;
    for (const job of data ?? [])
      await dispatchEvent({ type: "job_status", jobId: job.id, status: "approved" });
  }
  await dispatchEvent({
    type: "company_status",
    companyId: parsed.data.company_id,
    status: "verified",
  });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "company.verified",
    entityType: "company",
    entityId: parsed.data.company_id,
    metadata: { published },
  });
  revalidateAdmin();
  return ok({ published });
}

export async function setCompanyStatus(
  companyId: string,
  status: "suspended" | "verified" | "pending",
): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ status }).eq("id", companyId);
  if (error) return err(ERR.generic);
  await dispatchEvent({ type: "company_status", companyId, status });
  await logAdminActivity({
    actorUserId: admin.id,
    action: `company.${status}`,
    entityType: "company",
    entityId: companyId,
  });
  revalidateAdmin();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function approveJob(jobId: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ status: "published" }).eq("id", jobId);
  if (error) return err(ERR.generic);
  await dispatchEvent({ type: "job_status", jobId, status: "approved" });
  const { data: approved } = await supabase
    .from("jobs")
    .select("slug")
    .eq("id", jobId)
    .maybeSingle();
  if (approved?.slug) {
    await notifyJobIndexed(publicEnv().NEXT_PUBLIC_SITE_URL, approved.slug, "URL_UPDATED");
  }
  await logAdminActivity({
    actorUserId: admin.id,
    action: "job.approved",
    entityType: "job",
    entityId: jobId,
  });
  revalidateAdmin();
  revalidatePath("/[locale]/jobs", "page");
  return ok(null);
}

export async function requestJobChanges(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = requestChangesSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "changes_requested", review_message: parsed.data.message })
    .eq("id", parsed.data.job_id);
  if (error) return err(ERR.generic);
  await dispatchEvent({
    type: "job_status",
    jobId: parsed.data.job_id,
    status: "changes_requested",
    message: parsed.data.message,
  });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "job.changes_requested",
    entityType: "job",
    entityId: parsed.data.job_id,
    metadata: { message: parsed.data.message },
  });
  revalidateAdmin();
  return ok(null);
}

export async function adminSetJobStatus(
  jobId: string,
  status: "paused" | "closed" | "published",
): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status, ...(status === "closed" ? { closes_at: new Date().toISOString() } : {}) })
    .eq("id", jobId);
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: `job.${status}`,
    entityType: "job",
    entityId: jobId,
  });
  revalidateAdmin();
  return ok(null);
}

export async function saveJobCommercials(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = commercialsSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("job_commercials").upsert({
    job_id: parsed.data.job_id,
    client_bill_rate_usd: parsed.data.client_bill_rate_usd ?? null,
    placement_fee_usd: parsed.data.placement_fee_usd ?? null,
    internal_notes: parsed.data.internal_notes || null,
    updated_by: admin.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "job.commercials_updated",
    entityType: "job",
    entityId: parsed.data.job_id,
  });
  revalidateAdmin();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export async function updateCandidateTags(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = candidateTagsSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("candidates")
    .update({ candidate_tags: parsed.data.tags })
    .eq("id", parsed.data.candidate_id);
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "candidate.tags_updated",
    entityType: "candidate",
    entityId: parsed.data.candidate_id,
    metadata: { tags: parsed.data.tags },
  });
  revalidateAdmin();
  return ok(null);
}

export async function addDexeeNote(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = dexeeNoteSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({
    candidate_id: parsed.data.candidate_id,
    application_id: parsed.data.application_id ?? null,
    author_user_id: admin.id,
    body: parsed.data.body,
    visibility: "dexee_only",
  });
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "candidate.note_added",
    entityType: "candidate",
    entityId: parsed.data.candidate_id,
  });
  revalidateAdmin();
  return ok(null);
}

export async function resolveDataRequest(id: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("data_requests")
    .update({ status: "resolved", resolved_by: admin.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "data_request.resolved",
    entityType: "data_request",
    entityId: id,
  });
  revalidateAdmin();
  return ok(null);
}

export async function getCandidateResumeUrlAdmin(
  candidateId: string,
): Promise<Result<{ url: string }>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const service = createAdminClient();
  const { data, error } = await service.storage
    .from("resumes")
    .createSignedUrl(`candidates/${candidateId}/resume.pdf`, 600);
  if (error || !data) return err(ERR.notFound);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "candidate.resume_viewed",
    entityType: "candidate",
    entityId: candidateId,
  });
  return ok({ url: data.signedUrl });
}

/** Streams the current candidate filter as CSV (SPEC 10.4). The caller passes ids already filtered server-side. */
export async function exportCandidatesCsv(
  candidateIds: string[],
): Promise<Result<{ csv: string; filename: string }>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  if (candidateIds.length === 0 || candidateIds.length > 2000) return err(ERR.validation);
  const supabase = await createClient();
  const [{ data: candidates }, { data: contacts }] = await Promise.all([
    supabase.from("candidates").select("*").in("id", candidateIds),
    supabase.from("candidate_contacts").select("*").in("candidate_id", candidateIds),
  ]);
  const contactById = new Map((contacts ?? []).map((c) => [c.candidate_id, c]));
  const header = [
    "id",
    "first_name",
    "last_name",
    "headline",
    "city",
    "role_family",
    "years_experience",
    "skills",
    "english_self_level",
    "english_written_level",
    "english_oral_level",
    "english_verified_level",
    "desired_salary_min_usd",
    "availability",
    "profile_completeness",
    "visibility",
    "tags",
    "email",
    "phone",
    "linkedin_url",
    "created_at",
  ];
  const escape = (value: unknown) => {
    const text =
      value === null || value === undefined
        ? ""
        : Array.isArray(value)
          ? value.join("; ")
          : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [header.join(",")];
  for (const c of candidates ?? []) {
    const contact = contactById.get(c.id);
    lines.push(
      [
        c.id,
        c.first_name,
        c.last_name,
        c.headline,
        c.city,
        c.role_family,
        c.years_experience,
        c.skills,
        c.english_self_level,
        c.english_written_level,
        c.english_oral_level,
        c.english_verified_level,
        c.desired_salary_min_usd,
        c.availability,
        c.profile_completeness,
        c.visibility,
        c.candidate_tags,
        contact?.email,
        contact?.phone,
        contact?.linkedin_url,
        c.created_at,
      ]
        .map(escape)
        .join(","),
    );
  }
  await logAdminActivity({
    actorUserId: admin.id,
    action: "candidates.exported",
    entityType: "candidate",
    metadata: { count: candidates?.length ?? 0 },
  });
  return ok({
    csv: lines.join("\n"),
    filename: `dexee-candidates-${new Date().toISOString().slice(0, 10)}.csv`,
  });
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function adminChangeApplicationStatus(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = applicationStatusSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.application_id);
  if (error) return err(ERR.generic);
  await dispatchEvent({
    type: "application_status",
    applicationId: parsed.data.application_id,
    status: parsed.data.status,
  });
  if (parsed.data.status === "hired")
    await dispatchEvent({ type: "placement_pending", applicationId: parsed.data.application_id });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "application.status_changed",
    entityType: "application",
    entityId: parsed.data.application_id,
    metadata: { status: parsed.data.status },
  });
  revalidateAdmin();
  return ok(null);
}

export async function releaseContact(applicationId: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      contact_released: true,
      contact_released_by: admin.id,
      contact_released_at: new Date().toISOString(),
    })
    .eq("id", applicationId);
  if (error) return err(ERR.generic);
  await dispatchEvent({ type: "contact_released", applicationId });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "application.contact_released",
    entityType: "application",
    entityId: applicationId,
  });
  revalidateAdmin();
  return ok(null);
}

export async function recommendCandidate(
  input: unknown,
): Promise<Result<{ applicationId: string }>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = recommendSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id: parsed.data.job_id,
      candidate_id: parsed.data.candidate_id,
      source: "dexee_recommended",
      status: "shortlisted",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return err(ERR.duplicate);
    logger.warn({ err: error.message }, "recommend_failed");
    return err(ERR.generic);
  }
  await dispatchEvent({ type: "recommendation", applicationId: data.id });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "application.recommended",
    entityType: "application",
    entityId: data.id,
    metadata: { job_id: parsed.data.job_id, candidate_id: parsed.data.candidate_id },
  });
  revalidateAdmin();
  return ok({ applicationId: data.id });
}

// ---------------------------------------------------------------------------
// Placements
// ---------------------------------------------------------------------------

export async function createPlacement(input: unknown): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = placementSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id, status, candidate_id, jobs (company_id)")
    .eq("id", parsed.data.application_id)
    .maybeSingle();
  if (!application || !application.jobs) return err(ERR.notFound);
  if (application.status !== "hired") return err(ERR.conflict);
  const { data, error } = await supabase
    .from("placements")
    .insert({
      application_id: application.id,
      company_id: application.jobs.company_id,
      candidate_id: application.candidate_id,
      contract_type: parsed.data.contract_type,
      start_date: parsed.data.start_date,
      monthly_salary_usd: parsed.data.monthly_salary_usd,
      monthly_bill_rate_usd: parsed.data.monthly_bill_rate_usd,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (error) return err(error.code === "23505" ? ERR.duplicate : ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "placement.created",
    entityType: "placement",
    entityId: data.id,
    metadata: { application_id: application.id },
  });
  revalidateAdmin();
  return ok({ id: data.id });
}

export async function endPlacement(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = endPlacementSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase
    .from("placements")
    .update({ status: "ended", end_date: parsed.data.end_date })
    .eq("id", parsed.data.placement_id);
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "placement.ended",
    entityType: "placement",
    entityId: parsed.data.placement_id,
  });
  revalidateAdmin();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Team and settings
// ---------------------------------------------------------------------------

export async function inviteAdmin(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = adminInviteSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const service = createAdminClient();
  const locale = admin.profile?.locale ?? "en";
  const { data, error } = await service.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { role: "candidate", full_name: parsed.data.full_name, locale },
  });
  if (error || !data.user) return err(error?.code === "email_exists" ? "emailTaken" : ERR.generic);
  // handle_new_user creates the profile as candidate; promote it right away.
  const { error: roleError } = await service.from("profiles").upsert({
    id: data.user.id,
    role: "admin",
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    locale,
  });
  if (roleError) return err(ERR.generic);
  await dispatchEvent({ type: "admin_invite", email: parsed.data.email, locale });
  await logAdminActivity({
    actorUserId: admin.id,
    action: "admin.invited",
    entityType: "profile",
    entityId: data.user.id,
    metadata: { email: parsed.data.email },
  });
  revalidateAdmin();
  return ok(null);
}

export async function deactivateAdmin(userId: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  if (userId === admin.id) return err(ERR.conflict);
  const service = createAdminClient();
  const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "admin.deactivated",
    entityType: "profile",
    entityId: userId,
  });
  revalidateAdmin();
  return ok(null);
}

export async function updateAssessmentConfig(input: unknown): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!admin) return err(ERR.unauthorized);
  const parsed = assessmentConfigSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  let config: Json;
  try {
    config = JSON.parse(parsed.data.config) as Json;
  } catch {
    return err(ERR.validation, { config: ["invalidJson"] });
  }
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("assessments")
    .select("version")
    .eq("id", parsed.data.assessment_id)
    .maybeSingle();
  const { error } = await supabase
    .from("assessments")
    .update({
      config,
      is_active: parsed.data.is_active,
      cooldown_days: parsed.data.cooldown_days,
      time_limit_minutes: parsed.data.time_limit_minutes,
      version: (current?.version ?? 0) + 1,
    })
    .eq("id", parsed.data.assessment_id);
  if (error) return err(ERR.generic);
  await logAdminActivity({
    actorUserId: admin.id,
    action: "assessment.config_updated",
    entityType: "assessment",
    entityId: parsed.data.assessment_id,
    metadata: { version: (current?.version ?? 0) + 1 },
  });
  revalidateAdmin();
  return ok(null);
}

export type AdminJobStatus = Database["public"]["Enums"]["job_status"];
