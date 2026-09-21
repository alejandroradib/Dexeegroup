import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/lib/env";
import { buildAbsoluteAlternates } from "@/lib/seo/alternates";
import { buildJobPostingJsonLd } from "@/lib/seo/job-posting";
import { jobIndexingUrls } from "@/lib/seo/job-urls";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";
import type { PublicJob } from "@/server/services/public-jobs";

const job: PublicJob = {
  id: "e0000000-0000-4000-8000-000000000001",
  title: "Senior Accountant",
  slug: "senior-accountant-e00000",
  role_family: "finance_accounting",
  seniority: "senior",
  contract_type: "dexee_eor",
  employment_type: "full_time",
  work_mode: "remote",
  english_level_required: "C1",
  skills: [],
  description: "Own the close.",
  responsibilities: null,
  requirements: null,
  hours_per_week: 40,
  timezone_overlap: null,
  start_date: null,
  salary_min_usd: null,
  salary_max_usd: null,
  show_salary: false,
  confidential_company: false,
  company_name: "Harbor",
  company_logo_path: null,
  company_sector: null,
  company_size: null,
  published_at: "2026-09-01T00:00:00.000Z",
  closes_at: null,
};

/** Everything after the scheme must be free of "//". */
const noDoubleSlash = (url: string) => !url.replace(/^https?:\/\//, "").includes("//");

/**
 * Audit D1: NEXT_PUBLIC_SITE_URL was configured with a trailing slash in production and every
 * `${siteUrl}/...` join produced "//" in the sitemap, hreflang, JobPosting url and the URLs
 * sent to Google's Indexing API.
 */
describe("site URL normalization", () => {
  for (const raw of ["https://dexeegroup.com/", "https://dexeegroup.com//"]) {
    it(`strips the trailing slash from ${raw}`, () => {
      const env = parsePublicEnv({
        NEXT_PUBLIC_SITE_URL: raw,
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      } as unknown as NodeJS.ProcessEnv);
      const site = env.NEXT_PUBLIC_SITE_URL;
      expect(site).toBe("https://dexeegroup.com");

      const sitemap = buildSitemapEntries(site, [{ slug: job.slug!, published_at: null }]);
      expect(sitemap.length).toBeGreaterThan(0);
      for (const entry of sitemap) {
        expect(noDoubleSlash(entry.url)).toBe(true);
        for (const alt of Object.values(entry.alternates?.languages ?? {})) {
          expect(noDoubleSlash(alt as string)).toBe(true);
        }
      }
      for (const alt of Object.values(buildAbsoluteAlternates(site, "/pricing"))) {
        expect(noDoubleSlash(alt)).toBe(true);
      }
      const ld = buildJobPostingJsonLd(job, { siteUrl: site, locale: "en" });
      expect(ld.url).toBe("https://dexeegroup.com/en/jobs/senior-accountant-e00000");
      for (const url of jobIndexingUrls(site, job.slug!)) {
        expect(noDoubleSlash(url)).toBe(true);
      }
    });
  }
});
