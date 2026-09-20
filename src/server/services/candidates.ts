import { createClient } from "@/lib/supabase/server";
import { CEFR_RANK } from "@/lib/validation/enums";
import type { Database } from "@/types/database";

import type { PublicJob } from "./public-jobs";

type Tables = Database["public"]["Tables"];
export type Candidate = Tables["candidates"]["Row"];
export type CandidateContact = Tables["candidate_contacts"]["Row"];
export type CandidateExperience = Tables["candidate_experience"]["Row"];
export type CandidateEducation = Tables["candidate_education"]["Row"];

export type CandidateProfile = {
  candidate: Candidate;
  contact: CandidateContact | null;
  experience: CandidateExperience[];
  education: CandidateEducation[];
};

export async function getCurrentCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!candidate) return null;
  const [contact, experience, education] = await Promise.all([
    supabase.from("candidate_contacts").select("*").eq("candidate_id", userId).maybeSingle(),
    supabase
      .from("candidate_experience")
      .select("*")
      .eq("candidate_id", userId)
      .order("sort_order")
      .order("start_date", { ascending: false }),
    supabase
      .from("candidate_education")
      .select("*")
      .eq("candidate_id", userId)
      .order("end_year", { ascending: false }),
  ]);
  return {
    candidate,
    contact: contact.data,
    experience: experience.data ?? [],
    education: education.data ?? [],
  };
}

export type CandidateApplication = Tables["applications"]["Row"] & {
  job: Pick<
    PublicJob,
    "id" | "title" | "slug" | "company_name" | "confidential_company" | "contract_type"
  > | null;
  events: Tables["application_events"]["Row"][];
};

export async function listCandidateApplications(userId: string): Promise<CandidateApplication[]> {
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false });
  const rows = applications ?? [];
  if (rows.length === 0) return [];
  const jobIds = rows.map((a) => a.job_id);
  const [{ data: jobs }, { data: events }] = await Promise.all([
    supabase
      .from("public_jobs")
      .select("id, title, slug, company_name, confidential_company, contract_type")
      .in("id", jobIds),
    supabase
      .from("application_events")
      .select("*")
      .in(
        "application_id",
        rows.map((a) => a.id),
      )
      .order("created_at", { ascending: true }),
  ]);
  const jobById = new Map((jobs ?? []).map((j) => [j.id, j]));
  return rows.map((a) => ({
    ...a,
    job: jobById.get(a.job_id) ?? null,
    events: (events ?? []).filter((e) => e.application_id === a.id),
  }));
}

export async function getCandidateApplicationForJob(userId: string, jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, created_at")
    .eq("candidate_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();
  return data;
}

/** Recommended jobs: same role family, English required <= verified or self level, salary max >= expectation (SPEC 10.3). */
export async function listRecommendedJobs(candidate: Candidate, limit = 6): Promise<PublicJob[]> {
  const supabase = await createClient();
  let query = supabase
    .from("public_jobs")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(60);
  if (candidate.role_family) query = query.eq("role_family", candidate.role_family);
  const { data } = await query;
  const level = candidate.english_verified_level ?? candidate.english_self_level;
  const rank = level ? CEFR_RANK[level] : null;
  return (data ?? [])
    .filter((job) => {
      if (
        job.english_level_required &&
        rank !== null &&
        CEFR_RANK[job.english_level_required] > rank
      )
        return false;
      if (job.english_level_required && rank === null) return false;
      if (
        candidate.desired_salary_min_usd !== null &&
        job.salary_max_usd !== null &&
        job.salary_max_usd < candidate.desired_salary_min_usd
      )
        return false;
      return true;
    })
    .slice(0, limit);
}

export type AssessmentHubItem = {
  assessment: Tables["assessments"]["Row"];
  latest: Tables["assessment_attempts"]["Row"] | null;
  open: Tables["assessment_attempts"]["Row"] | null;
  nextAllowedAt: string | null;
  /** Minutes left on the open attempt, computed server-side so components stay pure. */
  remainingMinutes: number | null;
  canStart: boolean;
  /** When the latest validated result stops counting, or null without one. */
  validUntil: string | null;
  /** True when there is a validated result whose window has closed. */
  expired: boolean;
};

/** One line of what a candidate still needs before applying; mirrors candidate_apply_requirements(). */
export type ApplyRequirement = {
  requirement: Database["public"]["Enums"]["assessment_type"] | "resume";
  satisfied: boolean;
  validUntil: string | null;
};

/**
 * Reads the requirements from the same function the applications trigger enforces, so the
 * checklist a candidate sees and the rule that refuses an application cannot drift apart.
 */
export async function getApplyRequirements(userId: string): Promise<ApplyRequirement[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("candidate_apply_requirements", {
    target_candidate_id: userId,
  });
  // The local type generator emits unknown[] for table-returning functions.
  const rows = (data ?? []) as {
    requirement: string;
    satisfied: boolean;
    valid_until: string | null;
  }[];
  return rows.map((row) => ({
    requirement: row.requirement as ApplyRequirement["requirement"],
    satisfied: row.satisfied,
    validUntil: row.valid_until,
  }));
}

export function missingRequirements(items: ApplyRequirement[]): ApplyRequirement[] {
  return items.filter((item) => !item.satisfied);
}

export async function getAssessmentHub(userId: string): Promise<AssessmentHubItem[]> {
  const supabase = await createClient();
  const [{ data: assessments }, { data: attempts }] = await Promise.all([
    supabase.from("assessments").select("*").eq("is_active", true).order("type"),
    supabase
      .from("assessment_attempts")
      .select("*")
      .eq("candidate_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  const items: AssessmentHubItem[] = [];
  for (const assessment of assessments ?? []) {
    const mine = (attempts ?? []).filter((a) => a.assessment_id === assessment.id);
    const open = mine.find((a) => a.status === "in_progress") ?? null;
    const latest = mine.find((a) => a.status !== "in_progress" && a.status !== "expired") ?? null;
    const { data: next } = await supabase.rpc("assessment_cooldown_ok", {
      target_assessment_id: assessment.id,
      target_candidate_id: userId,
    });
    const nextAllowedAt = (next as string | null) ?? null;
    const now = Date.now();
    const remainingMinutes = open?.expires_at
      ? Math.max(0, Math.round((new Date(open.expires_at).getTime() - now) / 60000))
      : null;
    const canStart = !open && (nextAllowedAt === null || new Date(nextAllowedAt).getTime() <= now);
    const validated = mine.find((a) => a.status === "validated") ?? null;
    const validUntil = validated?.valid_until ?? null;
    const expired = validUntil !== null && new Date(validUntil).getTime() <= now;
    items.push({
      assessment,
      latest,
      open,
      nextAllowedAt,
      remainingMinutes,
      canStart,
      validUntil,
      expired,
    });
  }
  return items;
}

export async function listDataRequests(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("data_requests")
    .select("*")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
