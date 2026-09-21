/**
 * Public URLs of a job, one per locale. Pure and free of "server-only" so both the Indexing
 * API client and the tests can use it. The base is stripped of trailing slashes because a
 * value configured as "https://example.com/" would otherwise produce "//" (audit D1).
 */
export function jobIndexingUrls(
  siteUrl: string,
  slug: string,
  locales: readonly string[] = ["en", "es"],
): string[] {
  const base = siteUrl.replace(/\/+$/, "");
  return locales.map((locale) => `${base}/${locale}/jobs/${slug}`);
}
