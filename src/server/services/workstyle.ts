import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Band descriptors of the latest validated work-style attempt the candidate chose to share.
 * Uses the service role because companies have no policy on assessment_attempts; the visibility
 * flag is the gate and numeric scores are never returned.
 */
export async function getVisibleWorkstyleBands(
  candidateId: string,
): Promise<Record<string, string> | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assessment_attempts")
    .select("report, assessments!inner (type)")
    .eq("candidate_id", candidateId)
    .eq("status", "validated")
    .eq("visible_to_companies", true)
    .eq("assessments.type", "psychometric")
    .order("validated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const report = data?.report as { factors?: Record<string, { band?: string }> } | null | undefined;
  if (!report?.factors) return null;
  const bands: Record<string, string> = {};
  for (const [factor, value] of Object.entries(report.factors)) {
    if (value?.band) bands[factor] = value.band;
  }
  return Object.keys(bands).length > 0 ? bands : null;
}
