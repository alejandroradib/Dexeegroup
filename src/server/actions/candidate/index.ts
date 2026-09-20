"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consentFlagsSchema } from "@/lib/validation/auth";
import {
  accountSchema,
  applySchema,
  changePasswordSchema,
  compensationStepSchema,
  dataRequestSchema,
  educationSchema,
  englishStepSchema,
  experienceSchema,
  identityStepSchema,
  professionalStepSchema,
} from "@/lib/validation/candidate";
import { getApplyRequirements, missingRequirements } from "@/server/services/candidates";
import { dispatchEvent } from "@/server/services/events";
import { ERR, err, ok, type Result } from "@/server/services/result";
import type { Json } from "@/types/database";

async function requireCandidate() {
  const user = await getSessionUser();
  if (!user || user.role !== "candidate") return null;
  return user;
}

function fieldErrors(error: { flatten: () => { fieldErrors: unknown } }) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function revalidateCandidate() {
  revalidatePath("/[locale]/candidate", "layout");
}

export async function saveIdentityStep(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = identityStepSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("candidates")
      .update({ first_name: d.first_name, last_name: d.last_name, city: d.city })
      .eq("id", user.id),
    supabase.from("candidate_contacts").upsert({
      candidate_id: user.id,
      email: user.email,
      phone: d.phone || null,
      linkedin_url: d.linkedin_url || null,
      portfolio_url: d.portfolio_url || null,
    }),
  ]);
  if (e1 || e2) {
    logger.warn({ err: e1?.message ?? e2?.message }, "identity_step_failed");
    return err(ERR.generic);
  }
  revalidateCandidate();
  return ok(null);
}

export async function saveProfessionalStep(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = professionalStepSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update(parsed.data).eq("id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function upsertExperience(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const d = parsed.data;
  const normalize = (v: string) => (v.length === 7 ? `${v}-01` : v);
  const supabase = await createClient();
  const row = {
    candidate_id: user.id,
    company: d.company,
    title: d.title,
    start_date: normalize(d.start_date),
    end_date: d.is_current || !d.end_date ? null : normalize(d.end_date),
    is_current: d.is_current,
    description: d.description || null,
  };
  const { data, error } = d.id
    ? await supabase
        .from("candidate_experience")
        .update(row)
        .eq("id", d.id)
        .eq("candidate_id", user.id)
        .select("id")
        .single()
    : await supabase.from("candidate_experience").insert(row).select("id").single();
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok({ id: data.id });
}

export async function deleteExperience(id: string): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("candidate_experience")
    .delete()
    .eq("id", id)
    .eq("candidate_id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function upsertEducation(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const d = parsed.data;
  const supabase = await createClient();
  const row = {
    candidate_id: user.id,
    institution: d.institution,
    degree: d.degree || null,
    field: d.field || null,
    start_year: d.start_year ?? null,
    end_year: d.end_year ?? null,
  };
  const { data, error } = d.id
    ? await supabase
        .from("candidate_education")
        .update(row)
        .eq("id", d.id)
        .eq("candidate_id", user.id)
        .select("id")
        .single()
    : await supabase.from("candidate_education").insert(row).select("id").single();
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok({ id: data.id });
}

export async function deleteEducation(id: string): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("candidate_education")
    .delete()
    .eq("id", id)
    .eq("candidate_id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function saveEnglishStep(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = englishStepSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update(parsed.data).eq("id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function saveCompensationStep(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = compensationStepSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update(parsed.data).eq("id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

/** Called after the PDF was uploaded through the signed URL; the route already validated type and size. */
export async function confirmResumeUpload(): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const path = `candidates/${user.id}/resume.pdf`;
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("resumes").list(`candidates/${user.id}`);
  const file = (files ?? []).find((f) => f.name === "resume.pdf");
  if (!file) return err(ERR.notFound);
  const meta = file.metadata as { mimetype?: string; size?: number } | null;
  if (meta?.mimetype && meta.mimetype !== "application/pdf") {
    await admin.storage.from("resumes").remove([path]);
    return err("fileType");
  }
  if (meta?.size && meta.size > 5 * 1024 * 1024) {
    await admin.storage.from("resumes").remove([path]);
    return err("fileSize");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("candidate_contacts")
    .upsert({ candidate_id: user.id, resume_path: path });
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function removeResume(): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  await admin.storage.from("resumes").remove([`candidates/${user.id}/resume.pdf`]);
  const supabase = await createClient();
  await supabase
    .from("candidate_contacts")
    .update({ resume_path: null })
    .eq("candidate_id", user.id);
  revalidateCandidate();
  return ok(null);
}

export async function getOwnResumeUrl(): Promise<Result<{ url: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(`candidates/${user.id}/resume.pdf`, 600);
  if (error || !data) return err(ERR.notFound);
  return ok({ url: data.signedUrl });
}

export async function applyToJob(input: unknown): Promise<Result<{ applicationId: string }>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  // The database trigger is the rule; this read gives the candidate a named list instead
  // of a refused insert, and returns the same items the checklist shows.
  const missing = missingRequirements(await getApplyRequirements(user.id));
  if (missing.length > 0) {
    return err("requirementsMissing", { missing: missing.map((m) => m.requirement) });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id: parsed.data.job_id,
      candidate_id: user.id,
      cover_note: parsed.data.cover_note || null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return err(ERR.duplicate);
    if (error.code === "42501") return err(ERR.forbidden);
    const refused = error.message.match(/requirements_missing:(\S+)/);
    if (refused) return err("requirementsMissing", { missing: (refused[1] ?? "").split(",") });
    logger.warn({ err: error.message }, "apply_failed");
    return err(ERR.generic);
  }
  await dispatchEvent({ type: "new_application", applicationId: data.id });
  revalidateCandidate();
  return ok({ applicationId: data.id });
}

export async function withdrawApplication(applicationId: string): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("candidate_id", user.id)
    .select("id")
    .maybeSingle();
  if (error)
    return err(error.message.includes("withdraw_not_allowed") ? "withdrawNotAllowed" : ERR.generic);
  if (!data) return err(ERR.notFound);
  await dispatchEvent({ type: "application_status", applicationId, status: "withdrawn" });
  revalidateCandidate();
  return ok(null);
}

export async function setWorkstyleVisibility(
  attemptId: string,
  visible: boolean,
): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_attempts")
    .update({ visible_to_companies: visible })
    .eq("id", attemptId)
    .eq("candidate_id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function setCandidateVisibility(
  visibility: "visible_to_companies" | "dexee_only",
): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update({ visibility }).eq("id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}

export async function createDataRequest(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = dataRequestSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_requests")
    .insert({ candidate_id: user.id, kind: parsed.data.kind, message: parsed.data.message || null })
    .select("id")
    .single();
  if (error) return err(ERR.generic);
  await dispatchEvent({ type: "data_request", dataRequestId: data.id });
  revalidateCandidate();
  return ok(null);
}

export async function updateAccount(input: unknown): Promise<Result<null>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return err(ERR.generic);
  revalidatePath("/", "layout");
  return ok(null);
}

export async function changePassword(input: unknown): Promise<Result<null>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation, fieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  return error ? err(ERR.generic) : ok(null);
}

export async function updateConsentFlags(input: unknown): Promise<Result<null>> {
  const user = await requireCandidate();
  if (!user) return err(ERR.unauthorized);
  const parsed = consentFlagsSchema.safeParse(input);
  if (!parsed.success) return err(ERR.validation);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("candidates")
    .select("consent_flags")
    .eq("id", user.id)
    .maybeSingle();
  const current = (row?.consent_flags as Record<string, unknown> | null) ?? {};
  const { error } = await supabase
    .from("candidates")
    .update({
      consent_flags: { ...current, ...parsed.data, updated_at: new Date().toISOString() } as Json,
    })
    .eq("id", user.id);
  if (error) return err(ERR.generic);
  revalidateCandidate();
  return ok(null);
}
