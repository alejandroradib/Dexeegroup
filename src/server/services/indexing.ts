import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { notifyJobIndexed, type IndexingAction } from "@/lib/seo/indexing-api";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tells Google a job URL changed. Feature-flagged inside `notifyJobIndexed` (no credential,
 * no call) and never fails the action that triggered it. Jobs of demo companies are skipped:
 * they are not on the public board or in the sitemap, and Google's JobPosting guidelines
 * require real openings (audit B).
 */
export async function pingJobIndexing(jobId: string, action: IndexingAction): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("jobs")
      .select("slug, companies!inner (is_demo)")
      .eq("id", jobId)
      .maybeSingle();
    if (!data?.slug || data.companies?.is_demo) return;
    await notifyJobIndexed(publicEnv().NEXT_PUBLIC_SITE_URL, data.slug, action);
  } catch (error) {
    logger.warn({ err: (error as Error).message, jobId }, "indexing_ping_failed");
  }
}
