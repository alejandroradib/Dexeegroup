import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];
export type LeadRow = Database["public"]["Tables"]["contact_requests"]["Row"];
export type LeadStatus = Enums["lead_status"];

export type LeadFilter = {
  status?: LeadStatus;
  seniority?: Enums["seniority"];
  q?: string;
};

/**
 * The lead queue (PHASES-GTM 9.4). Reads through the caller's session, so RLS decides:
 * only an admin sees a row, which is the rule this list depends on rather than a check
 * in the page.
 *
 * Ordered oldest first within the default `new` filter, because the queue exists to keep
 * a one-business-day promise and the oldest lead is the one at risk.
 */
export async function listLeads(filter: LeadFilter, range: { from: number; to: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("contact_requests")
    .select("*", { count: "exact" })
    .eq("request_type", "hire")
    .order("created_at", { ascending: filter.status !== "answered" })
    .range(range.from, range.to);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.seniority) query = query.eq("seniority", filter.seniority);
  if (filter.q) {
    const term = filter.q.replace(/[%_,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%,role_to_fill.ilike.%${term}%`,
      );
    }
  }

  const { data, count } = await query;
  return { rows: data ?? [], total: count ?? 0 };
}

export type LeadCounts = Record<LeadStatus, number>;

/** Counts per status for the queue's filter chips. */
export async function countLeadsByStatus(): Promise<LeadCounts> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_requests")
    .select("status")
    .eq("request_type", "hire");
  const counts: LeadCounts = { new: 0, answered: 0, converted: 0, discarded: 0 };
  for (const row of data ?? []) counts[row.status] += 1;
  return counts;
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("contact_requests").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
