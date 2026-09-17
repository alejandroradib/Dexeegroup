import { getTranslations } from "next-intl/server";

import { AssessmentsHub } from "@/components/domain/candidate/assessments-hub";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAssessmentHub } from "@/server/services/candidates";

export default async function AssessmentsPage({
  params,
}: PageProps<"/[locale]/candidate/assessments">) {
  await pageLocale(params);
  const user = await getSessionUser();
  const [items, t] = await Promise.all([
    getAssessmentHub(user!.id),
    getTranslations("candidate.assessments"),
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <AssessmentsHub items={items} />
    </>
  );
}
