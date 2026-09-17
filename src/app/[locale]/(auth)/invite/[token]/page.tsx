import { getTranslations } from "next-intl/server";

import { AuthCard } from "@/components/domain/auth/auth-card";
import { InviteForm } from "@/components/domain/auth/invite-form";
import { Alert } from "@/components/ui/alert";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/invite/[token]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("invite"), robots: { index: false } };
}

export default async function InvitePage({ params }: PageProps<"/[locale]/invite/[token]">) {
  await pageLocale(params);
  const { token } = await params;
  const t = await getTranslations("auth.invite");
  const te = await getTranslations("enums.member_role");
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("company_members")
    .select("invited_email, accepted_at, role, companies(name)")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite || invite.accepted_at || !invite.invited_email) {
    return (
      <AuthCard title={t("invalid")}>
        <Alert variant="danger">{t("invalid")}</Alert>
      </AuthCard>
    );
  }
  const user = await getSessionUser();
  const companyName = invite.companies?.name ?? "Dexee";
  return (
    <AuthCard
      title={t("title", { company: companyName })}
      subtitle={t("body", { role: te(invite.role) })}
    >
      <InviteForm token={token} email={invite.invited_email} signedInEmail={user?.email} />
    </AuthCard>
  );
}
