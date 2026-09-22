import type { InterviewJobContext } from "@/lib/ai/prompts/interviewer";
import { INTERVIEW_COOLDOWN_DAYS } from "@/lib/interview/questions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MockInterview = Database["public"]["Tables"]["mock_interviews"]["Row"];

export type InterviewOverview = {
  open: MockInterview | null;
  history: MockInterview[];
  nextAllowedAt: string | null;
};

export async function getInterviewOverview(candidateId: string): Promise<InterviewOverview> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = data ?? [];
  const open = rows.find((r) => r.status === "in_progress") ?? null;
  const completed = rows.filter((r) => r.status === "completed");
  const last = completed[0];
  let nextAllowedAt: string | null = null;
  if (last?.completed_at) {
    const next = new Date(last.completed_at).getTime() + INTERVIEW_COOLDOWN_DAYS * 24 * 3600 * 1000;
    if (next > Date.now()) nextAllowedAt = new Date(next).toISOString();
  }
  return { open, history: rows.filter((r) => r.status !== "in_progress"), nextAllowedAt };
}

export async function getInterview(candidateId: string, id: string): Promise<MockInterview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mock_interviews")
    .select("*")
    .eq("id", id)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  return data;
}

export type InterviewJobOption = {
  id: string;
  title: string;
  company_name: string | null;
  english_level_required: Database["public"]["Enums"]["cefr_level"] | null;
  role_family: Database["public"]["Enums"]["role_family"] | null;
};

/**
 * Jobs a candidate can rehearse for: the ones they applied to (any status, so a paused job
 * still counts) plus, when given, a published job they are looking at. Reads through the
 * candidate's own client, so RLS decides what is visible.
 */
export async function listInterviewJobOptions(
  candidateId: string,
  extraJobId?: string | null,
): Promise<InterviewJobOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("candidate_application_jobs");
  const applied = (data ?? []) as unknown as {
    id: string;
    title: string;
    company_name: string | null;
  }[];
  const ids = new Set(applied.map((j) => j.id));
  if (extraJobId) ids.add(extraJobId);
  if (ids.size === 0) return [];
  const { data: jobs } = await supabase
    .from("public_jobs")
    .select("id, title, company_name, english_level_required, role_family")
    .in("id", [...ids]);
  const byId = new Map(
    (jobs ?? [])
      .filter((j): j is typeof j & { id: string; title: string } => Boolean(j.id && j.title))
      .map((j) => [j.id, j]),
  );
  // Applied jobs that are no longer published still resolve through the function.
  for (const j of applied) {
    if (!byId.has(j.id))
      byId.set(j.id, {
        id: j.id,
        title: j.title,
        company_name: j.company_name,
        english_level_required: null,
        role_family: null,
      });
  }
  return [...byId.values()].map((j) => ({
    id: j.id,
    title: j.title ?? "",
    company_name: j.company_name,
    english_level_required: j.english_level_required,
    role_family: j.role_family,
  }));
}

/**
 * Full brief for the interviewer prompt. Service role, because the candidate cannot read
 * `jobs` directly; the caller has already checked the job is one the candidate may see and
 * the database trigger checks it again on insert. Confidential companies stay unnamed.
 */
export async function getInterviewJobContext(jobId: string): Promise<
  | (InterviewJobContext & {
      roleFamily: Database["public"]["Enums"]["role_family"] | null;
      englishLevel: Database["public"]["Enums"]["cefr_level"] | null;
    })
  | null
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs")
    .select(
      "title, seniority, description, responsibilities, requirements, skills, english_level_required, role_family, confidential_company, companies (name)",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!data) return null;
  const company = data.companies as { name: string } | null;
  return {
    title: data.title,
    companyName: data.confidential_company ? null : (company?.name ?? null),
    seniority: data.seniority,
    description: data.description,
    responsibilities: data.responsibilities,
    requirements: data.requirements,
    skills: data.skills ?? [],
    englishLevelRequired: data.english_level_required,
    roleFamily: data.role_family,
    englishLevel: data.english_level_required,
  };
}
