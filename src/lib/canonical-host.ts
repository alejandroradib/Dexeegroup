/**
 * Canonical-host redirect (audit G2).
 *
 * Three hosts can serve the production deployment: the apex, `www` and the `*.vercel.app`
 * alias. Supabase session cookies are bound to the exact host and the email links always
 * point at `NEXT_PUBLIC_SITE_URL`, so a registration started on `www` ends with a PKCE
 * exchange that cannot find its verifier cookie. The Vercel panel redirects the extra
 * domains; this is the in-code backstop in case that configuration drifts.
 *
 * Pure so it can be unit tested. The proxy calls it before anything else.
 */
export function canonicalRedirect(input: {
  /** The request URL (path and query are preserved on the redirect). */
  url: URL;
  /** Host the client actually asked for: `x-forwarded-host`, else the `host` header. */
  host: string | null | undefined;
  /** `NEXT_PUBLIC_SITE_URL`, already normalised by the env schema. */
  siteUrl: string;
  /** `process.env.VERCEL_ENV`: only "production" redirects. */
  vercelEnv: string | undefined;
}): string | null {
  if (input.vercelEnv !== "production") return null;
  // Cron and webhook calls hit the API by whatever host Vercel dials; never bounce them.
  if (input.url.pathname === "/api" || input.url.pathname.startsWith("/api/")) return null;

  let canonical: URL;
  try {
    canonical = new URL(input.siteUrl);
  } catch {
    return null;
  }
  // A misconfigured site URL must never turn into a redirect loop for every visitor.
  if (!isPublicHostname(canonical.hostname)) return null;

  const requested = normaliseHost(input.host ?? input.url.host);
  if (!requested || requested === normaliseHost(canonical.host)) return null;

  return `${canonical.origin}${input.url.pathname}${input.url.search}`;
}

function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

function isPublicHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  if (hostname.startsWith("[")) return false;
  return hostname.includes(".");
}
