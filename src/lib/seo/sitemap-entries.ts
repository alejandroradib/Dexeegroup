import { locales } from "@/i18n/routing";
import { COMPARE_SLUGS } from "@/lib/content/compare";
import { buildAbsoluteAlternates } from "@/lib/seo/alternates";

import type { MetadataRoute } from "next";

export const STATIC_PATHS = [
  "",
  "/for-companies",
  "/for-talent",
  "/pricing",
  "/guarantee",
  "/how-we-verify",
  "/sample-report",
  ...COMPARE_SLUGS.map((slug) => `/compare/${slug}`),
  "/jobs",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

export type SitemapJob = { slug: string; published_at: string | null };

/**
 * Pure builder behind app/sitemap.ts: static pages plus one entry per public job and
 * locale. The job list is whatever `public_jobs` returns, so a job the view hides (closed,
 * suspended or demo company) never gets an entry. Kept pure so it can be tested over PGlite.
 */
export function buildSitemapEntries(base: string, jobs: SitemapJob[]): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        changeFrequency: path === "/jobs" ? "daily" : "monthly",
        priority: path === "" ? 1 : 0.7,
        alternates: { languages: buildAbsoluteAlternates(base, path) },
      });
    }
  }
  for (const job of jobs) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/jobs/${job.slug}`,
        lastModified: job.published_at ?? undefined,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: { languages: buildAbsoluteAlternates(base, `/jobs/${job.slug}`) },
      });
    }
  }
  return entries;
}
