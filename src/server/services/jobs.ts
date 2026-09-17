import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { err, ok, type Result } from "./result";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type JobWithCounts = Job & { counts: Record<ApplicationStatus, number>; total: number };

const EMPTY_COUNTS = (): Record<ApplicationStatus, number> => ({ applied: 0, screening: 0, shortlisted: 0, interview: 0, offer: 0, hired: 0, rejected: 0, withdrawn: 0 });

export async function listCompanyJobs(companyId: string): Promise<JobWithCounts[]> {
  const supabase = await createClient();
  const [{ data: jobs }, { data: apps }] = await Promise.all([
    supabase.from("jobs").select("*").eq("company_id", companyId).order("updated_at", { ascending: false }),
    supabase.from("applications").select("job_id, status, jobs!inner (company_id)").eq("jobs.company_id", companyId),
  ]);
  const counts = new Map<string, Record<ApplicationStatus, number>>();
  for (const a of apps ?? []) {
    const c = counts.get(a.job_id) ?? EMPTY_COUNTS();
    c[a.status] += 1;
    counts.set(a.job_id, c);
  }
  return (jobs ?? []).map((job) => {
    const c = counts.get(job.id) ?? EMPTY_COUNTS();
    return { ...job, counts: c, total: Object.values(c).reduce((s, n) => s + n, 0) };
  });
}

export async function getCompanyJob(jobId: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  return data;
}

export type PipelineCard = {
  application: Database["public"]["Tables"]["applications"]["Row"];
  candidate: Database["public"]["Views"]["candidate_cards"]["Row"] | null;
  saved: boolean;
  workstyleVisible: boolean;
};

export async function getPipeline(jobId: string, companyId: string): Promise<Result<{ job: Job; cards: PipelineCard[] }>> {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return err("notFound");
  const { data: applications, error } = await supabase.from("applications").select("*").eq("job_id", jobId).order("created_at", { ascending: false });
  if (error) return err(error.message);
  const candidateIds = (applications ?? []).map((a) => a.candidate_id);
  const [{ data: cards }, { data: saved }, { data: visibleAttempts }] = await Promise.all([
    candidateIds.length ? supabase.from("candidate_cards").select("*").in("id", candidateIds) : Promise.resolve({ data: [] as Database["public"]["Views"]["candidate_cards"]["Row"][] }),
    supabase.from("saved_candidates").select("candidate_id").eq("company_id", companyId),
    Promise.resolve({ data: [] as { candidate_id: string }[] }),
  ]);
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const savedSet = new Set((saved ?? []).map((s) => s.candidate_id));
  const visibleSet = new Set((visibleAttempts ?? []).map((v) => v.candidate_id));
  return ok({
    job,
    cards: (applications ?? []).map((application) => ({
      application,
      candidate: cardById.get(application.candidate_id) ?? null,
      saved: savedSet.has(application.candidate_id),
      workstyleVisible: visibleSet.has(application.candidate_id),
    })),
  });
}

export type ApplicantRow = PipelineCard & { job: Pick<Job, "id" | "title" | "slug"> };

export async function listCompanyApplicants(companyId: string, filter: { status?: ApplicationStatus; jobId?: string; q?: string }, range: { from: number; to: number }): Promise<{ rows: ApplicantRow[]; total: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select("*, jobs!inner (id, title, slug, company_id)", { count: "exact" })
    .eq("jobs.company_id", companyId)
    .order("created_at", { ascending: false })
    .range(range.from, range.to);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.jobId) query = query.eq("job_id", filter.jobId);
  const { data, count } = await query;
  const rows = data ?? [];
  const ids = rows.map((r) => r.candidate_id);
  const [{ data: cards }, { data: saved }] = await Promise.all([
    ids.length ? supabase.from("candidate_cards").select("*").in("id", ids) : Promise.resolve({ data: [] as Database["public"]["Views"]["candidate_cards"]["Row"][] }),
    supabase.from("saved_candidates").select("candidate_id").eq("company_id", companyId),
  ]);
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const savedSet = new Set((saved ?? []).map((s) => s.candidate_id));
  let result: ApplicantRow[] = rows.map((row) => {
    const { jobs, ...application } = row;
    return { application, candidate: cardById.get(row.candidate_id) ?? null, saved: savedSet.has(row.candidate_id), workstyleVisible: false, job: { id: jobs.id, title: jobs.title, slug: jobs.slug } };
  });
  if (filter.q) {
    const q = filter.q.toLowerCase();
    result = result.filter((r) => `${r.candidate?.first_name ?? ""} ${r.candidate?.headline ?? ""} ${(r.candidate?.skills ?? []).join(" ")}`.toLowerCase().includes(q));
  }
  return { rows: result, total: count ?? 0 };
}

export type ApplicantDetail = {
  application: Database["public"]["Tables"]["applications"]["Row"];
  job: Pick<Job, "id" | "title">;
  card: Database["public"]["Views"]["candidate_cards"]["Row"] | null;
  experience: Database["public"]["Tables"]["candidate_experience"]["Row"][];
  education: Database["public"]["Tables"]["candidate_education"]["Row"][];
  contact: Database["public"]["Tables"]["candidate_contacts"]["Row"] | null;
  notes: (Database["public"]["Tables"]["notes"]["Row"] & { profiles: { full_name: string | null } | null })[];
  events: Database["public"]["Tables"]["application_events"]["Row"][];
  workstyleBands: Record<string, string> | null;
  saved: boolean;
};

/** Everything the company may see about one applicant. Contact rows come back only when released (RLS). */
export async function getApplicantDetail(applicationId: string, companyId: string): Promise<ApplicantDetail | null> {
  const supabase = await createClient();
  const { data: application } = await supabase.from("applications").select("*, jobs!inner (id, title, company_id)").eq("id", applicationId).eq("jobs.company_id", companyId).maybeSingle();
  if (!application) return null;
  const candidateId = application.candidate_id;
  const [card, experience, education, contact, notes, events, saved] = await Promise.all([
    supabase.from("candidate_cards").select("*").eq("id", candidateId).maybeSingle(),
    supabase.from("candidate_experience").select("*").eq("candidate_id", candidateId).order("sort_order"),
    supabase.from("candidate_education").select("*").eq("candidate_id", candidateId).order("end_year", { ascending: false }),
    supabase.from("candidate_contacts").select("*").eq("candidate_id", candidateId).maybeSingle(),
    supabase.from("notes").select("*, profiles:author_user_id (full_name)").eq("application_id", applicationId).order("created_at", { ascending: false }),
    supabase.from("application_events").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }),
    supabase.from("saved_candidates").select("candidate_id").eq("company_id", companyId).eq("candidate_id", candidateId).maybeSingle(),
  ]);
  const { jobs, ...applicationRow } = application;
  return {
    application: applicationRow,
    job: { id: jobs.id, title: jobs.title },
    card: card.data,
    experience: experience.data ?? [],
    education: education.data ?? [],
    contact: application.contact_released ? contact.data : null,
    notes: (notes.data ?? []) as ApplicantDetail["notes"],
    events: events.data ?? [],
    workstyleBands: null,
    saved: Boolean(saved.data),
  };
}

export async function listSkillSuggestions(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("skills").limit(200);
  const counts = new Map<string, number>();
  for (const row of data ?? []) for (const s of row.skills ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([s]) => s);
}
