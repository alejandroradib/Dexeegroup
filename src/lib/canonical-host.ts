/**
 * Canonical-host redirect (audit G2).
 *
 * Three hosts can serve the production deployment: the apex, `www` and the `*.vercel.app`
 * alias. Supabase session cookies are bound to the exact host and the email links always
 * point at `NEXT_PUBLIC_SITE_URL`, so a registration started on `www` ends with a PKCE
 * exchange that cannot find its verifier cookie. The Vercel panel redirects the extra
 * domains; this is the in-code backstop in case that configuration drifts.
 *
 * The `www` sibling of the canonical host is deliberately left to the panel. Vercel's
 * domain redirect runs at the edge before this code, and the code cannot see which way it
 * points: when the panel sent the apex to `www` and this function sent `www` back, every
 * visitor looped until the browser gave up (DECISIONS 91). The panel owns the www/apex
 * pair; this backstop only covers hosts the panel cannot loop with, such as `*.vercel.app`.
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
  const canonicalHost = normaliseHost(canonical.host);
  if (!requested || requested === canonicalHost) return null;
  // Never fight the Vercel panel over the www/apex pair: it redirects before this runs and
  // an opposite setting would loop. Whichever of the two the panel chooses stands.
  if (isWwwSibling(requested, canonicalHost)) return null;

  return `${canonical.origin}${input.url.pathname}${input.url.search}`;
}

function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

function isWwwSibling(a: string, b: string): boolean {
  return a === `www.${b}` || b === `www.${a}`;
}

function isPublicHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  if (hostname.startsWith("[")) return false;
  return hostname.includes(".");
}
