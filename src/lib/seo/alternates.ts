/**
 * Canonical and hreflang alternates for public pages (PHASES-GTM 9.5).
 *
 * Every marketing page repeated the same block by hand and none emitted `x-default`,
 * so a search engine had no way to know which language to serve a visitor whose own
 * language Dexee does not publish.
 */

import { locales, type Locale } from "@/i18n/routing";

type Alternates = {
  canonical: string;
  languages: Record<string, string>;
};

/**
 * `path` is the route without the locale prefix, starting with a slash, or "" for the
 * home page. `x-default` points at English, which is the language a US buyer reads.
 */
export function buildAlternates(locale: string, path = ""): Alternates {
  const clean = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const other of locales) languages[other] = `/${other}${clean}`;
  languages["x-default"] = `/en${clean}`;
  return { canonical: `/${locale}${clean}`, languages };
}

/** Absolute variant, for the sitemap, where relative URLs are not allowed. */
export function buildAbsoluteAlternates(siteUrl: string, path = ""): Record<string, string> {
  const clean = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const other of locales as readonly Locale[]) {
    languages[other] = `${siteUrl}/${other}${clean}`;
  }
  languages["x-default"] = `${siteUrl}/en${clean}`;
  return languages;
}
