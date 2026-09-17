import { cache } from "react";

import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  profile: Profile | null;
  role: UserRole | null;
};

/** Reads the session and profile once per request (React cache). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    profile: profile ?? null,
    role: profile?.role ?? null,
  };
});

export const roleHome: Record<UserRole, string> = {
  company: "/company",
  candidate: "/candidate",
  admin: "/admin",
};

/** Ensures the current user has the given role; redirects otherwise. Never returns null. */
export async function requireRole(role: UserRole, locale: Locale, next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect({ href: { pathname: "/sign-in", query: next ? { next } : undefined }, locale });
  }
  const resolved = user as SessionUser;
  if (resolved.role !== role) {
    redirect({ href: resolved.role ? roleHome[resolved.role] : "/sign-in", locale });
  }
  return resolved;
}

export async function requireUser(locale: Locale, next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect({ href: { pathname: "/sign-in", query: next ? { next } : undefined }, locale });
  }
  return user as SessionUser;
}
