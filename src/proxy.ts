import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { isLocale, routing, type Locale } from "@/i18n/routing";
import { canonicalRedirect } from "@/lib/canonical-host";
import { publicEnv } from "@/lib/env";
import { buildContentSecurityPolicy, generateNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

const APP_PREFIXES: Record<string, "company" | "candidate" | "admin"> = {
  company: "company",
  candidate: "candidate",
  admin: "admin",
};
const AUTH_PAGES = new Set(["sign-in", "sign-up", "forgot-password"]);

function splitPath(pathname: string): { locale: Locale | null; segments: string[] } {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first)) return { locale: first, segments: segments.slice(1) };
  return { locale: null, segments };
}

export async function proxy(request: NextRequest) {
  // One host serves the app in production (audit G2). The Vercel panel redirects the
  // others; this backstop keeps a registration from starting on a host whose cookies the
  // email link can never reach.
  const canonical = canonicalRedirect({
    url: request.nextUrl,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    siteUrl: publicEnv().NEXT_PUBLIC_SITE_URL,
    vercelEnv: process.env.VERCEL_ENV,
  });
  if (canonical) return NextResponse.redirect(canonical, 308);

  // Per-request CSP nonce (audit H1). Set on the request so Next.js stamps its own inline
  // scripts and server components can read `x-nonce`; next-intl forwards request headers.
  const env = publicEnv();
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    analyticsProvider: env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
    dev: process.env.NODE_ENV === "development",
  });
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  const response = handleI18n(request);
  response.headers.set("Content-Security-Policy", csp);
  // Redirects/rewrites from next-intl (e.g. missing locale prefix) are returned as is.
  if (response.headers.get("location")) return response;

  const { locale, segments } = splitPath(request.nextUrl.pathname);
  const area = segments[0] ? APP_PREFIXES[segments[0]] : undefined;
  const isAuthPage = segments[0] ? AUTH_PAGES.has(segments[0]) : false;
  if (!area && !isAuthPage) return response;

  const { supabase, user } = await updateSession(request, response);
  const currentLocale = locale ?? routing.defaultLocale;

  if (area && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${currentLocale}/sign-in`;
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (!user) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  if (!role) return response;

  if (isAuthPage || (area && area !== role)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${currentLocale}/${role}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|brand|fonts|.*\\..*).*)"],
};
