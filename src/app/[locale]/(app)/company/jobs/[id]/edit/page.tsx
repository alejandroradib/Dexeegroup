import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { JobWizard } from "@/components/domain/company/job-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getCurrentCompany } from "@/server/services/companies";
import { getCompanyJob, listSkillSuggestions } from "@/server/services/jobs";

export default async function EditJobPage({
  params,
}: PageProps<"/[locale]/company/jobs/[id]/edit">) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const [job, t, suggestions] = await Promise.all([
    getCompanyJob(id),
    getTranslations("company.wizard"),
    listSkillSuggestions(),
  ]);
  if (!job) notFound();
  return (
    <>
      <PageHeader
        title={job.title === "Untitled role" ? t("newTitle") : job.title}
        eyebrow={t("title")}
        actions={<StatusChip kind="job" status={job.status} />}
      />
      <JobWizard key={job.id} job={job} company={company!} skillSuggestions={suggestions} />
    </>
  );
}
