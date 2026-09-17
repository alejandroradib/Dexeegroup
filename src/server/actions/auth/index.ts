"use server";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getSessionUser, roleHome } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { CONSENT_VERSION } from "@/lib/legal";
import { logger } from "@/lib/logger";
import { hashIdentifier, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  safeNext,
  signInSchema,
  signUpCandidateSchema,
  signUpCompanySchema,
} from "@/lib/validation/auth";
import { ERR, err, ok, type Result } from "@/server/services/result";

async function currentLocale(): Promise<Locale> {
  return (await getLocale()) === "es" ? "es" : "en";
}

function callbackUrl(locale: Locale, next: string): string {
  const base = publicEnv().NEXT_PUBLIC_SITE_URL;
  return `${base}/auth/callback?locale=${locale}&next=${encodeURIComponent(next)}`;
}

async function limited(scope: string, identifier: string): Promise<boolean> {
  const ip = await clientIp();
  const [byIp, byId] = await Promise.all([
    rateLimit(`${scope}:ip`, hashIdentifier(ip), { limit: 20, windowSeconds: 900 }),
    rateLimit(`${scope}:id`, hashIdentifier(identifier), { limit: 10, windowSeconds: 900 }),
  ]);
  return !byIp.success || !byId.success;
}

export async function signIn(input: unknown): Promise<Result<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success)
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  if (await limited("signin", parsed.data.email)) return err(ERR.rateLimited);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") return err("emailNotConfirmed");
    return err("invalidCredentials");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", data.user.id)
    .maybeSingle();
  const locale = profile?.locale ?? (await currentLocale());
  const home = profile?.role ? roleHome[profile.role] : "/";
  return ok({ redirectTo: `/${locale}${safeNext(parsed.data.next, home)}` });
}

export async function signUpCompany(input: unknown): Promise<Result<{ email: string }>> {
  const parsed = signUpCompanySchema.safeParse(input);
  if (!parsed.success)
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  if (await limited("signup", parsed.data.email)) return err(ERR.rateLimited);
  const locale = await currentLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        role: "company",
        full_name: parsed.data.full_name,
        locale,
        company_name: parsed.data.company_name,
      },
      emailRedirectTo: callbackUrl(locale, safeNext(parsed.data.next, "/company/onboarding")),
    },
  });
  if (error) return err(mapAuthError(error.code, error.message));
  // Supabase returns a user with an empty identities array when the email already exists.
  if (data.user && data.user.identities && data.user.identities.length === 0)
    return err("emailTaken");
  return ok({ email: parsed.data.email });
}

export async function signUpCandidate(input: unknown): Promise<Result<{ email: string }>> {
  const parsed = signUpCandidateSchema.safeParse(input);
  if (!parsed.success)
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  if (await limited("signup", parsed.data.email)) return err(ERR.rateLimited);
  const locale = await currentLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        role: "candidate",
        full_name: `${parsed.data.first_name} ${parsed.data.last_name}`,
        locale,
      },
      emailRedirectTo: callbackUrl(locale, safeNext(parsed.data.next, "/candidate/onboarding")),
    },
  });
  if (error) return err(mapAuthError(error.code, error.message));
  if (!data.user || (data.user.identities && data.user.identities.length === 0))
    return err("emailTaken");

  // The user cannot write its own candidate row before confirming the email, so the server does it.
  const admin = createAdminClient();
  const { error: candidateError } = await admin.from("candidates").insert({
    id: data.user.id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    data_consent_at: new Date().toISOString(),
    data_consent_version: CONSENT_VERSION,
  });
  if (candidateError) {
    logger.error(
      { err: candidateError.message, userId: data.user.id },
      "candidate_row_insert_failed",
    );
    return err(ERR.generic);
  }
  await admin
    .from("candidate_contacts")
    .upsert({ candidate_id: data.user.id, email: parsed.data.email });
  return ok({ email: parsed.data.email });
}

export async function resendVerification(email: string): Promise<Result<null>> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return err(ERR.validation);
  if (await limited("resend", parsed.data.email)) return err(ERR.rateLimited);
  const locale = await currentLocale();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl(locale, "/") },
  });
  if (error) return err(ERR.generic);
  return ok(null);
}

export async function forgotPassword(input: unknown): Promise<Result<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success)
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  if (await limited("forgot", parsed.data.email)) return err(ERR.rateLimited);
  const locale = await currentLocale();
  const supabase = await createClient();
  // Always report success so the form does not reveal whether the email exists.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(locale, "/reset-password"),
  });
  return ok(null);
}

export async function resetPassword(input: unknown): Promise<Result<{ redirectTo: string }>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success)
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error || !data.user) return err("invalidLink");
  const user = await getSessionUser();
  const locale = user?.profile?.locale ?? (await currentLocale());
  return ok({ redirectTo: `/${locale}${user?.role ? roleHome[user.role] : "/sign-in"}` });
}

export async function signOut(): Promise<void> {
  const locale = await currentLocale();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/sign-in", locale });
}

export async function updateLocale(locale: Locale): Promise<Result<null>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) return err(ERR.generic);
  return ok(null);
}

/** Company member invitation: creates the account (or links the signed-in one) and accepts the membership. */
export async function acceptInvite(input: unknown): Promise<Result<{ redirectTo: string }>> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success)
    return err(ERR.validation, parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("company_members")
    .select("id, company_id, invited_email, accepted_at, role")
    .eq("invite_token", parsed.data.token)
    .maybeSingle();
  if (!invite || invite.accepted_at || !invite.invited_email) return err("inviteInvalid");
  const locale = await currentLocale();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: invite.invited_email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { role: "company", full_name: parsed.data.full_name, locale },
  });
  if (error || !created.user) return err(mapAuthError(error?.code, error?.message));

  const { error: linkError } = await admin
    .from("company_members")
    .update({ user_id: created.user.id, accepted_at: new Date().toISOString(), invite_token: null })
    .eq("id", invite.id);
  if (linkError) return err(ERR.generic);

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: invite.invited_email,
    password: parsed.data.password,
  });
  return ok({ redirectTo: `/${locale}/company` });
}

/** Accepts an invite with the currently signed-in company user when the emails match. */
export async function acceptInviteSignedIn(token: string): Promise<Result<{ redirectTo: string }>> {
  const user = await getSessionUser();
  if (!user) return err(ERR.unauthorized);
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("company_members")
    .select("id, invited_email, accepted_at, company_id")
    .eq("invite_token", token)
    .maybeSingle();
  if (!invite || invite.accepted_at) return err("inviteInvalid");
  if (invite.invited_email?.toLowerCase() !== user.email.toLowerCase())
    return err("inviteEmailMismatch");
  if (user.role !== "company") return err(ERR.forbidden);
  const { error } = await admin
    .from("company_members")
    .update({ user_id: user.id, accepted_at: new Date().toISOString(), invite_token: null })
    .eq("id", invite.id);
  if (error) return err(ERR.generic);
  const locale = user.profile?.locale ?? (await currentLocale());
  return ok({ redirectTo: `/${locale}/company` });
}

function mapAuthError(code: string | undefined, message: string | undefined): string {
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message?.toLowerCase().includes("already")
  )
    return "emailTaken";
  if (code === "weak_password") return "weakPassword";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit")
    return ERR.rateLimited;
  return ERR.generic;
}
