import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type AdoptionMetrics = {
  registered: number;
  withResume: number;
  withAssessment: number;
  allAssessments: number;
  withInterview: number;
  applied: number;
  hired: number;
};

export type AdminDashboard = {
  adoption: AdoptionMetrics;
  companiesPending: number;
  jobsPendingReview: number;
  applications7d: number;
  contactRequestsPending: number;
  attemptsPendingValidation: number;
  activePlacements: number;
  candidatesByLevel: Record<Enums["cefr_level"] | "none", number>;
  funnel: Record<Enums["application_status"], number>;
};

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [companies, jobs, apps, attempts, placements, candidates, contacts, validated, interviews] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase
        .from("applications")
        .select("id, status, created_at, contact_requested_at, contact_released, candidate_id"),
      supabase
        .from("assessment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_validation"),
      supabase
        .from("placements")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("candidates").select("id, english_verified_level"),
      supabase.from("candidate_contacts").select("candidate_id").not("resume_path", "is", null),
      supabase
        .from("assessment_attempts")
        .select("candidate_id, assessment_id")
        .eq("status", "validated"),
      supabase.from("mock_interviews").select("candidate_id").eq("status", "completed"),
    ]);
  const perCandidate = new Map<string, Set<string>>();
  for (const a of validated.data ?? []) {
    const set = perCandidate.get(a.candidate_id) ?? new Set<string>();
    set.add(a.assessment_id);
    perCandidate.set(a.candidate_id, set);
  }
  const adoption: AdoptionMetrics = {
    registered: candidates.data?.length ?? 0,
    withResume: new Set((contacts.data ?? []).map((c) => c.candidate_id)).size,
    withAssessment: perCandidate.size,
    allAssessments: [...perCandidate.values()].filter((s) => s.size >= 3).length,
    withInterview: new Set((interviews.data ?? []).map((i) => i.candidate_id)).size,
    applied: new Set((apps.data ?? []).map((a) => a.candidate_id)).size,
    hired: new Set((apps.data ?? []).filter((a) => a.status === "hired").map((a) => a.candidate_id))
      .size,
  };
  const funnel = {
    applied: 0,
    screening: 0,
    shortlisted: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  } as AdminDashboard["funnel"];
  let applications7d = 0;
  let contactRequestsPending = 0;
  for (const a of apps.data ?? []) {
    funnel[a.status] += 1;
    if (a.created_at >= since) applications7d += 1;
    if (a.contact_requested_at && !a.contact_released) contactRequestsPending += 1;
  }
  const candidatesByLevel = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
    none: 0,
  } as AdminDashboard["candidatesByLevel"];
  for (const c of candidates.data ?? []) candidatesByLevel[c.english_verified_level ?? "none"] += 1;
  return {
    adoption,
    companiesPending: companies.count ?? 0,
    jobsPendingReview: jobs.count ?? 0,
    applications7d,
    contactRequestsPending,
    attemptsPendingValidation: attempts.count ?? 0,
    activePlacements: placements.count ?? 0,
    candidatesByLevel,
    funnel,
  };
}

export type CompanyRow = Tables["companies"]["Row"] & {
  jobs_count: number;
  owner: { full_name: string | null; email: string } | null;
};

export async function listCompanies(
  filter: { q?: string; status?: Enums["company_status"] },
  range: { from: number; to: number },
) {
  const supabase = await createClient();
  let query = supabase
    .from("companies")
    .select("*, owner:owner_user_id (full_name, email), jobs (id)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.q) query = query.ilike("name", `%${filter.q.replace(/[%_]/g, " ")}%`);
  const { data, count } = await query;
  const rows: CompanyRow[] = (data ?? []).map((row) => {
    const { jobs, owner, ...company } = row;
    return { ...company, owner: owner ?? null, jobs_count: jobs?.length ?? 0 };
  });
  return { rows, total: count ?? 0 };
}

export async function getCompanyDetail(id: string) {
  const supabase = await createClient();
  const [company, members, jobs, notes] = await Promise.all([
    supabase
      .from("companies")
      .select("*, owner:owner_user_id (full_name, email)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("company_members")
      .select("*, profiles:user_id (full_name, email)")
      .eq("company_id", id)
      .order("created_at"),
    supabase
      .from("jobs")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_activity")
      .select("*, profiles:actor_user_id (full_name)")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (!company.data) return null;
  return {
    company: company.data,
    members: members.data ?? [],
    jobs: jobs.data ?? [],
    activity: notes.data ?? [],
  };
}

export type AdminJobRow = Tables["jobs"]["Row"] & {
  companies: { id: string; name: string; status: Enums["company_status"] } | null;
  applications_count: number;
};

export async function listAdminJobs(
  filter: { queue?: boolean; status?: Enums["job_status"]; q?: string },
  range: { from: number; to: number },
) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("*, companies (id, name, status), applications (id)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(range.from, range.to);
  if (filter.queue) query = query.in("status", ["pending_review", "changes_requested"]);
  else if (filter.status) query = query.eq("status", filter.status);
  if (filter.q) query = query.ilike("title", `%${filter.q.replace(/[%_]/g, " ")}%`);
  const { data, count } = await query;
  const rows: AdminJobRow[] = (data ?? []).map((row) => {
    const { applications, ...job } = row;
    return { ...job, applications_count: applications?.length ?? 0 };
  });
  return { rows, total: count ?? 0 };
}

export async function getAdminJobDetail(id: string) {
  const supabase = await createClient();
  const [job, commercials, applications] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, companies (id, name, status, logo_path, sector, size)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("job_commercials").select("*").eq("job_id", id).maybeSingle(),
    supabase
      .from("applications")
      .select("*, candidates (first_name, last_name)")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!job.data) return null;
  return { job: job.data, commercials: commercials.data, applications: applications.data ?? [] };
}

export type CandidateFilter = {
  country?: string;
  q?: string;
  role_family?: Enums["role_family"];
  level?: Enums["cefr_level"];
  availability?: Enums["availability"];
  visibility?: Enums["candidate_visibility"];
  min_completeness?: number;
  tag?: string;
};

export async function listAdminCandidates(
  filter: CandidateFilter,
  range: { from: number; to: number },
) {
  const supabase = await createClient();
  let query = supabase
    .from("candidates")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(range.from, range.to);
  if (filter.role_family) query = query.eq("role_family", filter.role_family);
  if (filter.country) query = query.eq("country", filter.country);
  if (filter.level) query = query.eq("english_verified_level", filter.level);
  if (filter.availability) query = query.eq("availability", filter.availability);
  if (filter.visibility) query = query.eq("visibility", filter.visibility);
  if (filter.min_completeness) query = query.gte("profile_completeness", filter.min_completeness);
  if (filter.tag) query = query.contains("candidate_tags", [filter.tag]);
  if (filter.q) {
    const term = filter.q.replace(/[%_,()]/g, " ").trim();
    if (term)
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,headline.ilike.%${term}%,city.ilike.%${term}%,skills.cs.{"${term}"}`,
      );
  }
  const { data, count } = await query;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getAdminCandidateDetail(id: string) {
  const supabase = await createClient();
  const [
    candidate,
    profile,
    contact,
    experience,
    education,
    applications,
    notes,
    attempts,
    dataRequests,
    interviews,
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("email, locale, created_at").eq("id", id).maybeSingle(),
    supabase.from("candidate_contacts").select("*").eq("candidate_id", id).maybeSingle(),
    supabase.from("candidate_experience").select("*").eq("candidate_id", id).order("sort_order"),
    supabase
      .from("candidate_education")
      .select("*")
      .eq("candidate_id", id)
      .order("end_year", { ascending: false }),
    supabase
      .from("applications")
      .select("*, jobs (id, title, companies (name))")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*, profiles:author_user_id (full_name)")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assessment_attempts")
      .select("*, assessments (type, title)")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("data_requests")
      .select("*")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("mock_interviews")
      .select("id, role_family, language, status, overall_score, report, created_at")
      .eq("candidate_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (!candidate.data) return null;
  return {
    candidate: candidate.data,
    profile: profile.data,
    contact: contact.data,
    experience: experience.data ?? [],
    education: education.data ?? [],
    applications: applications.data ?? [],
    notes: notes.data ?? [],
    attempts: attempts.data ?? [],
    dataRequests: dataRequests.data ?? [],
    interviews: interviews.data ?? [],
  };
}

export type AdminApplicationRow = Tables["applications"]["Row"] & {
  jobs: { id: string; title: string; companies: { id: string; name: string } | null } | null;
  candidates: {
    first_name: string;
    last_name: string;
    english_verified_level: Enums["cefr_level"] | null;
  } | null;
};

export async function listAdminApplications(
  filter: {
    status?: Enums["application_status"];
    contact?: "requested" | "released";
    q?: string;
    jobId?: string;
  },
  range: { from: number; to: number },
) {
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select(
      "*, jobs (id, title, companies (id, name)), candidates (first_name, last_name, english_verified_level)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.jobId) query = query.eq("job_id", filter.jobId);
  if (filter.contact === "requested")
    query = query.not("contact_requested_at", "is", null).eq("contact_released", false);
  if (filter.contact === "released") query = query.eq("contact_released", true);
  const { data, count } = await query;
  let rows = (data ?? []) as AdminApplicationRow[];
  if (filter.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter((r) =>
      `${r.candidates?.first_name ?? ""} ${r.candidates?.last_name ?? ""} ${r.jobs?.title ?? ""} ${r.jobs?.companies?.name ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }
  return { rows, total: count ?? 0 };
}

export type PlacementRow = Tables["placements"]["Row"] & {
  companies: { name: string } | null;
  candidates: { first_name: string; last_name: string } | null;
  applications: { jobs: { title: string } | null } | null;
};

export async function listPlacements() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("placements")
    .select("*, companies (name), candidates (first_name, last_name), applications (jobs (title))")
    .order("start_date", { ascending: false });
  return (data ?? []) as PlacementRow[];
}

export async function listHiredWithoutPlacement() {
  const supabase = await createClient();
  const [{ data: hired }, { data: placed }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, job_id, candidate_id, jobs (title, company_id, companies (name)), candidates (first_name, last_name)",
      )
      .eq("status", "hired"),
    supabase.from("placements").select("application_id"),
  ]);
  const placedIds = new Set((placed ?? []).map((p) => p.application_id));
  return (hired ?? []).filter((h) => !placedIds.has(h.id));
}

export type QueueAttempt = Tables["assessment_attempts"]["Row"] & {
  assessments: { type: Enums["assessment_type"]; title: string } | null;
  candidates: { first_name: string; last_name: string } | null;
};

export async function listValidationQueue(
  status: Enums["attempt_status"][] = ["pending_validation", "failed"],
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment_attempts")
    .select("*, assessments (type, title), candidates (first_name, last_name)")
    .in("status", status)
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .limit(200);
  return (data ?? []) as QueueAttempt[];
}

export async function listAdmins() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, locale, created_at")
    .eq("role", "admin")
    .order("created_at");
  return data ?? [];
}

export type ActivityRow = Tables["admin_activity"]["Row"] & {
  profiles: { full_name: string | null; email: string } | null;
};

export async function listActivity(
  filter: { action?: string; entity_type?: string; actor?: string },
  range: { from: number; to: number },
) {
  const supabase = await createClient();
  let query = supabase
    .from("admin_activity")
    .select("*, profiles:actor_user_id (full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  if (filter.action) query = query.ilike("action", `${filter.action}%`);
  if (filter.entity_type) query = query.eq("entity_type", filter.entity_type);
  if (filter.actor) query = query.eq("actor_user_id", filter.actor);
  const { data, count } = await query;
  return { rows: (data ?? []) as ActivityRow[], total: count ?? 0 };
}

export async function listAssessmentsAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.from("assessments").select("*").order("type");
  return data ?? [];
}

export async function listOpenJobsForRecommendation() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, companies (name)")
    .in("status", ["published", "paused"])
    .order("title");
  return data ?? [];
}
