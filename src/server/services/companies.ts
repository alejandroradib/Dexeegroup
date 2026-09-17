import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyMember = Database["public"]["Tables"]["company_members"]["Row"] & { profiles: { full_name: string | null; email: string } | null };

/** The company the signed-in user belongs to (owner or accepted member). v1 assumes one company per user. */
export async function getCurrentCompany(): Promise<Company | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return data;
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("*, profiles:user_id (full_name, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  return (data ?? []) as CompanyMember[];
}

export type CompanyDashboard = {
  openJobs: number;
  newApplicants7d: number;
  byStage: Record<Database["public"]["Enums"]["application_status"], number>;
  drafts: number;
  changesRequested: number;
  pendingReview: number;
  contactRequestsPending: number;
};

export async function getCompanyDashboard(companyId: string): Promise<CompanyDashboard> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [jobs, applications] = await Promise.all([
    supabase.from("jobs").select("id, status").eq("company_id", companyId),
    supabase.from("applications").select("id, status, created_at, contact_requested_at, contact_released, jobs!inner (company_id)").eq("jobs.company_id", companyId),
  ]);
  const jobRows = jobs.data ?? [];
  const appRows = applications.data ?? [];
  const byStage = { applied: 0, screening: 0, shortlisted: 0, interview: 0, offer: 0, hired: 0, rejected: 0, withdrawn: 0 } as CompanyDashboard["byStage"];
  for (const a of appRows) byStage[a.status] += 1;
  return {
    openJobs: jobRows.filter((j) => j.status === "published").length,
    newApplicants7d: appRows.filter((a) => a.created_at >= since).length,
    byStage,
    drafts: jobRows.filter((j) => j.status === "draft").length,
    changesRequested: jobRows.filter((j) => j.status === "changes_requested").length,
    pendingReview: jobRows.filter((j) => j.status === "pending_review").length,
    contactRequestsPending: appRows.filter((a) => a.contact_requested_at && !a.contact_released).length,
  };
}
