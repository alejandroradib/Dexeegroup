import { ACTIVE_APPLICATION_STATUSES } from "@/lib/jobs/material-terms";
import { createClient } from "@/lib/supabase/server";
import { listFitForApplications, type FitRow } from "@/server/services/fit";
import type { Database } from "@/types/database";

import { err, ok, type Result } from "./result";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type JobWithCounts = Job & { counts: Record<ApplicationStatus, number>; total: number };

const EMPTY_COUNTS = (): Record<ApplicationStatus, number> => ({
  applied: 0,
  screening: 0,
  shortlisted: 0,
  interview: 0,
  offer: 0,
  hired: 0,
  rejected: 0,
  withdrawn: 0,
});

export async function listCompanyJobs(companyId: string): Promise<JobWithCounts[]> {
  const supabase = await createClient();
  const [{ data: jobs }, { data: apps }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("applications")
      .select("job_id, status, jobs!inner (company_id)")
      .eq("jobs.company_id", companyId),
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

/** Applicants still in the running for a job; the ones told when its terms change. */
export async function countActiveApplicants(jobId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .in("status", [...ACTIVE_APPLICATION_STATUSES]);
  return count ?? 0;
}

export async function getCompanyJob(jobId: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  return data;
}

/** A valid assessment result the hiring company may see: level and dates, bands when shared, never scores. */
export type ValidResult = {
  type: Database["public"]["Enums"]["assessment_type"];
  finalLevel: Database["public"]["Enums"]["cefr_level"] | null;
  validatedAt: string | null;
  validUntil: string | null;
  bands: Record<string, string> | null;
};

export type PipelineCard = {
  application: Database["public"]["Tables"]["applications"]["Row"];
  candidate: Database["public"]["Views"]["candidate_cards"]["Row"] | null;
  saved: boolean;
  workstyleVisible: boolean;
  /** Valid results at the time of reading, one per assessment type. */
  results: ValidResult[];
  /** Fit analysis when ready; RLS returns it only to the hiring company. */
  fit: FitSummary | null;
};

export type FitSummary = {
  status: string;
  score: number | null;
  summary: string | null;
  strengths: string[];
  gaps: string[];
  computedAt: string | null;
};

function toFitSummary(row: FitRow | undefined): FitSummary | null {
  if (!row) return null;
  return {
    status: row.status,
    score: row.score,
    summary: row.summary,
    strengths: row.strengths ?? [],
    gaps: row.gaps ?? [],
    computedAt: row.computed_at,
  };
}

/** Reads candidate_valid_results() for many candidates; the function itself applies the access rule. */
export async function listValidResults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidateIds: string[],
): Promise<Map<string, ValidResult[]>> {
  const entries = await Promise.all(
    [...new Set(candidateIds)].map(async (candidateId) => {
      const { data } = await supabase.rpc("candidate_valid_results", {
        target_candidate_id: candidateId,
      });
      // The local type generator emits unknown[] for table-returning functions.
      const rows = (data ?? []) as {
        type: ValidResult["type"];
        final_level: ValidResult["finalLevel"];
        validated_at: string | null;
        valid_until: string | null;
        bands: Record<string, string> | null;
      }[];
      const results: ValidResult[] = rows.map((row) => ({
        type: row.type,
        finalLevel: row.final_level,
        validatedAt: row.validated_at,
        validUntil: row.valid_until,
        bands: row.bands ?? null,
      }));
      return [candidateId, results] as const;
    }),
  );
  return new Map(entries);
}

export async function getPipeline(
  jobId: string,
  companyId: string,
): Promise<Result<{ job: Job; cards: PipelineCard[] }>> {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return err("notFound");
  const { data: applications, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) return err(error.message);
  const candidateIds = (applications ?? []).map((a) => a.candidate_id);
  const [{ data: cards }, { data: saved }, resultsByCandidate, fitById] = await Promise.all([
    candidateIds.length
      ? supabase.from("candidate_cards").select("*").in("id", candidateIds)
      : Promise.resolve({ data: [] as Database["public"]["Views"]["candidate_cards"]["Row"][] }),
    supabase.from("saved_candidates").select("candidate_id").eq("company_id", companyId),
    listValidResults(supabase, candidateIds),
    listFitForApplications((applications ?? []).map((a) => a.id)),
  ]);
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const savedSet = new Set((saved ?? []).map((s) => s.candidate_id));
  return ok({
    job,
    cards: (applications ?? []).map((application) => {
      const results = resultsByCandidate.get(application.candidate_id) ?? [];
      return {
        application,
        candidate: cardById.get(application.candidate_id) ?? null,
        saved: savedSet.has(application.candidate_id),
        workstyleVisible: results.some((r) => r.type === "psychometric" && r.bands !== null),
        results,
        fit: toFitSummary(fitById.get(application.id)),
      };
    }),
  });
}

export type ApplicantRow = PipelineCard & { job: Pick<Job, "id" | "title" | "slug"> };

export async function listCompanyApplicants(
  companyId: string,
  filter: { status?: ApplicationStatus; jobId?: string; q?: string },
  range: { from: number; to: number },
): Promise<{ rows: ApplicantRow[]; total: number }> {
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
  const [{ data: cards }, { data: saved }, resultsByCandidate] = await Promise.all([
    ids.length
      ? supabase.from("candidate_cards").select("*").in("id", ids)
      : Promise.resolve({ data: [] as Database["public"]["Views"]["candidate_cards"]["Row"][] }),
    supabase.from("saved_candidates").select("candidate_id").eq("company_id", companyId),
    listValidResults(supabase, ids),
  ]);
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const savedSet = new Set((saved ?? []).map((s) => s.candidate_id));
  let result: ApplicantRow[] = rows.map((row) => {
    const { jobs, ...application } = row;
    const results = resultsByCandidate.get(row.candidate_id) ?? [];
    return {
      application,
      candidate: cardById.get(row.candidate_id) ?? null,
      saved: savedSet.has(row.candidate_id),
      workstyleVisible: results.some((r) => r.type === "psychometric" && r.bands !== null),
      results,
      fit: null,
      job: { id: jobs.id, title: jobs.title, slug: jobs.slug },
    };
  });
  if (filter.q) {
    const q = filter.q.toLowerCase();
    result = result.filter((r) =>
      `${r.candidate?.first_name ?? ""} ${r.candidate?.headline ?? ""} ${(r.candidate?.skills ?? []).join(" ")}`
        .toLowerCase()
        .includes(q),
    );
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
  notes: (Database["public"]["Tables"]["notes"]["Row"] & {
    profiles: { full_name: string | null } | null;
  })[];
  events: Database["public"]["Tables"]["application_events"]["Row"][];
  workstyleBands: Record<string, string> | null;
  discBands: Record<string, string> | null;
  /** Valid results, one per type, as candidate_valid_results() allows this company to see them. */
  results: ValidResult[];
  fit: FitSummary | null;
  saved: boolean;
};

/** Everything the company may see about one applicant. Contact rows come back only when released (RLS). */
export async function getApplicantDetail(
  applicationId: string,
  companyId: string,
): Promise<ApplicantDetail | null> {
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("*, jobs!inner (id, title, company_id)")
    .eq("id", applicationId)
    .eq("jobs.company_id", companyId)
    .maybeSingle();
  if (!application) return null;
  const candidateId = application.candidate_id;
  const [card, experience, education, contact, notes, events, saved] = await Promise.all([
    supabase.from("candidate_cards").select("*").eq("id", candidateId).maybeSingle(),
    supabase
      .from("candidate_experience")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("sort_order"),
    supabase
      .from("candidate_education")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("end_year", { ascending: false }),
    supabase.from("candidate_contacts").select("*").eq("candidate_id", candidateId).maybeSingle(),
    supabase
      .from("notes")
      .select("*, profiles:author_user_id (full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("application_events")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_candidates")
      .select("candidate_id")
      .eq("company_id", companyId)
      .eq("candidate_id", candidateId)
      .maybeSingle(),
  ]);
  const { jobs, ...applicationRow } = application;
  const [resultsMap, fitMap] = await Promise.all([
    listValidResults(supabase, [candidateId]),
    listFitForApplications([applicationId]),
  ]);
  const results = resultsMap.get(candidateId) ?? [];
  return {
    application: applicationRow,
    job: { id: jobs.id, title: jobs.title },
    card: card.data,
    experience: experience.data ?? [],
    education: education.data ?? [],
    contact: application.contact_released ? contact.data : null,
    notes: (notes.data ?? []) as ApplicantDetail["notes"],
    events: events.data ?? [],
    workstyleBands: results.find((r) => r.type === "psychometric")?.bands ?? null,
    discBands: results.find((r) => r.type === "disc")?.bands ?? null,
    results,
    fit: toFitSummary(fitMap.get(applicationId)),
    saved: Boolean(saved.data),
  };
}

export async function listSkillSuggestions(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("skills").limit(200);
  const counts = new Map<string, number>();
  for (const row of data ?? [])
    for (const s of row.skills ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([s]) => s);
}
