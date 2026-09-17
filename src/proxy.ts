import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { isLocale, routing, type Locale } from "@/i18n/routing";
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
  const response = handleI18n(request);
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

  const { data: profile } = await supabase.from("profiles").select("role, locale").eq("id", user.id).maybeSingle();
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
