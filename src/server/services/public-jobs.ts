import { pageRange, PAGE_SIZE } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import type { JobsFilter } from "@/lib/validation/jobs-filter";
import type { Database } from "@/types/database";

import { err, ok, type Result } from "./result";

export type PublicJob = Database["public"]["Views"]["public_jobs"]["Row"];

export async function listPublicJobs(filter: JobsFilter): Promise<Result<{ jobs: PublicJob[]; total: number; page: number }>> {
  const supabase = await createClient();
  const page = filter.page ?? 1;
  const { from, to } = pageRange(page, PAGE_SIZE);
  let query = supabase.from("public_jobs").select("*", { count: "exact" }).order("published_at", { ascending: false }).range(from, to);

  if (filter.q) {
    const term = filter.q.replace(/[%_,()]/g, " ").trim();
    if (term) query = query.or(`title.ilike.%${term}%,skills.cs.{"${term}"}`);
  }
  if (filter.role_family) query = query.eq("role_family", filter.role_family);
  if (filter.seniority) query = query.eq("seniority", filter.seniority);
  if (filter.contract_type) query = query.eq("contract_type", filter.contract_type);
  if (filter.work_mode) query = query.eq("work_mode", filter.work_mode);
  if (filter.min_salary) query = query.gte("salary_max_usd", filter.min_salary);
  if (filter.english_level) query = query.eq("english_level_required", filter.english_level);

  const { data, error, count } = await query;
  if (error) return err(error.message);
  return ok({ jobs: data ?? [], total: count ?? 0, page });
}

export async function getPublicJobBySlug(slug: string): Promise<Result<PublicJob | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("public_jobs").select("*").eq("slug", slug).maybeSingle();
  if (error) return err(error.message);
  return ok(data);
}

export async function listSimilarPublicJobs(job: PublicJob, limit = 3): Promise<PublicJob[]> {
  const supabase = await createClient();
  let query = supabase.from("public_jobs").select("*").neq("id", job.id ?? "").order("published_at", { ascending: false }).limit(limit);
  if (job.role_family) query = query.eq("role_family", job.role_family);
  const { data } = await query;
  return data ?? [];
}

export async function listAllPublicJobSlugs(): Promise<{ slug: string; published_at: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("slug, published_at").limit(1000);
  return (data ?? []).filter((r): r is { slug: string; published_at: string | null } => Boolean(r.slug));
}
