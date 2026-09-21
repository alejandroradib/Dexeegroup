import { publicEnv } from "@/lib/env";
import { buildSitemapEntries, type SitemapJob } from "@/lib/seo/sitemap-entries";
import { listAllPublicJobSlugs } from "@/server/services/public-jobs";

import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let jobs: SitemapJob[] = [];
  try {
    jobs = await listAllPublicJobSlugs();
  } catch {
    jobs = [];
  }
  return buildSitemapEntries(publicEnv().NEXT_PUBLIC_SITE_URL, jobs);
}
