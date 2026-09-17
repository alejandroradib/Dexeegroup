import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ProfileView } from "@/components/domain/candidate/profile-view";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentCandidateProfile } from "@/server/services/candidates";

export default async function CandidateProfilePage({ params }: PageProps<"/[locale]/candidate/profile">) {
  await pageLocale(params);
  const user = await getSessionUser();
  const [profile, t] = await Promise.all([getCurrentCandidateProfile(user!.id), getTranslations("candidate.profile")]);
  if (!profile) notFound();
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ProfileView profile={profile} email={user!.email} />
    </>
  );
}
