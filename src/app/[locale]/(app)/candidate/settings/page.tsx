import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CandidateSettings } from "@/components/domain/candidate/candidate-settings";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCandidateProfile, listDataRequests } from "@/server/services/candidates";

export default async function CandidateSettingsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/settings">) {
  const locale = await pageLocale(params);
  const query = await searchParams;
  const user = await getSessionUser();
  const supabase = await createClient();
  const [profile, t, dataRequests, { data: workstyle }] = await Promise.all([
    getCurrentCandidateProfile(user!.id),
    getTranslations("candidate.settings"),
    listDataRequests(user!.id),
    supabase
      .from("assessment_attempts")
      .select("id, visible_to_companies, assessments!inner (type)")
      .eq("candidate_id", user!.id)
      .eq("status", "validated")
      .eq("assessments.type", "psychometric")
      .order("validated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!profile) notFound();
  const prefs = {
    digest: true,
    application_updates: true,
    ...((user?.profile?.notification_prefs as object | null) ?? {}),
  } as { digest: boolean; application_updates: boolean };
  return (
    <>
      <PageHeader title={t("title")} />
      <CandidateSettings
        candidate={profile.candidate}
        email={user!.email}
        fullName={user?.profile?.full_name ?? ""}
        locale={user?.profile?.locale ?? locale}
        workstyleAttempt={
          workstyle
            ? { id: workstyle.id, visible_to_companies: workstyle.visible_to_companies }
            : null
        }
        dataRequests={dataRequests}
        prefs={prefs}
        initialTab={typeof query.tab === "string" ? query.tab : undefined}
      />
    </>
  );
}
