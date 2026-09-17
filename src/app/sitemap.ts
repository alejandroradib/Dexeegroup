import { locales } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import { listAllPublicJobSlugs } from "@/server/services/public-jobs";

import type { MetadataRoute } from "next";

const STATIC_PATHS = [
  "",
  "/for-companies",
  "/for-talent",
  "/jobs",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv().NEXT_PUBLIC_SITE_URL;
  const entries: MetadataRoute.Sitemap = [];
  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        changeFrequency: path === "/jobs" ? "daily" : "monthly",
        priority: path === "" ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])),
        },
      });
    }
  }
  let jobs: { slug: string; published_at: string | null }[] = [];
  try {
    jobs = await listAllPublicJobSlugs();
  } catch {
    jobs = [];
  }
  for (const job of jobs) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/jobs/${job.slug}`,
        lastModified: job.published_at ?? undefined,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}/jobs/${job.slug}`])),
        },
      });
    }
  }
  return entries;
}
