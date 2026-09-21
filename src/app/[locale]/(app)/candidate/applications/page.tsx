import { FileTextIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ApplicationsList } from "@/components/domain/candidate/applications-list";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCurrentCandidateProfile,
  listCandidateApplications,
} from "@/server/services/candidates";

export default async function CandidateApplicationsPage({
  params,
}: PageProps<"/[locale]/candidate/applications">) {
  await pageLocale(params);
  const user = await getSessionUser();
  const [applications, profile, t] = await Promise.all([
    listCandidateApplications(user!.id),
    getCurrentCandidateProfile(user!.id),
    getTranslations("candidate.applications"),
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {applications.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title={t("empty")}
          description={t("emptyBody")}
          action={
            <Button asChild>
              <Link href="/candidate/jobs">{t("browse")}</Link>
            </Button>
          }
        />
      ) : (
        <ApplicationsList
          applications={applications}
          visibility={profile?.candidate.visibility ?? null}
        />
      )}
    </>
  );
}
