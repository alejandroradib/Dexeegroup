import { INTERVIEW_COOLDOWN_DAYS } from "@/lib/interview/questions";
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
