import { getTranslations } from "next-intl/server";

import { CompanySettings } from "@/components/domain/company/company-settings";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { getCurrentCompany, listCompanyMembers } from "@/server/services/companies";

export default async function CompanySettingsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/company/settings">) {
  const locale = await pageLocale(params);
  const query = await searchParams;
  const [company, user] = await Promise.all([getCurrentCompany(), getSessionUser()]);
  if (!company) redirect({ href: "/company/onboarding", locale });
  const [t, members] = await Promise.all([
    getTranslations("company.settings"),
    listCompanyMembers(company!.id),
  ]);
  const prefs = {
    digest: true,
    application_updates: true,
    ...((user?.profile?.notification_prefs as object | null) ?? {}),
  } as { digest: boolean; application_updates: boolean };
  const logoUrl = company!.logo_path
    ? `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${company!.logo_path}`
    : null;
  return (
    <>
      <PageHeader title={t("title")} />
      <CompanySettings
        company={company!}
        members={members}
        isOwner={company!.owner_user_id === user?.id}
        currentUserId={user?.id ?? ""}
        prefs={prefs}
        logoUrl={logoUrl}
        initialTab={typeof query.tab === "string" ? query.tab : undefined}
      />
    </>
  );
}
