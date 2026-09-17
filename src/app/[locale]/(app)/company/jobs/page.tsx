import { BriefcaseIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { JobsTable } from "@/components/domain/company/jobs-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getCurrentCompany } from "@/server/services/companies";
import { listCompanyJobs } from "@/server/services/jobs";

export default async function CompanyJobsPage({ params }: PageProps<"/[locale]/company/jobs">) {
  const locale = await pageLocale(params);
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const [t, jobs] = await Promise.all([getTranslations("company.jobs"), listCompanyJobs(company!.id)]);
  const newButton = <Button asChild variant="accent"><Link href="/company/jobs/new">{t("new")}</Link></Button>;
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={newButton} />
      <JobsTable jobs={jobs} emptyState={<EmptyState icon={BriefcaseIcon} title={t("empty")} description={t("emptyBody")} action={newButton} />} />
    </>
  );
}
