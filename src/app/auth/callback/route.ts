import { NextResponse, type NextRequest } from "next/server";

import { isLocale } from "@/i18n/routing";
import { roleHome } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

/** Exchanges the PKCE code from Supabase email links for a session, then sends the user on. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const requestedLocale = url.searchParams.get("locale") ?? "en";
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  const next = safeNext(url.searchParams.get("next") ?? undefined, "/");

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/${locale}/sign-in?error=link`, url.origin));
    }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/${locale}/sign-in`, url.origin));

  const { data: profile } = await supabase.from("profiles").select("role, locale").eq("id", user.id).maybeSingle();
  const finalLocale = profile?.locale ?? locale;
  const destination = next !== "/" ? next : profile?.role ? roleHome[profile.role] : "/";
  return NextResponse.redirect(new URL(`/${finalLocale}${destination}`, url.origin));
}
