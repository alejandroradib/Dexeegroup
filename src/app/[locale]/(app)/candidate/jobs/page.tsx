import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { JobsBoard } from "@/components/domain/jobs/jobs-board";
import { JobsBoardSkeleton } from "@/components/domain/jobs/jobs-board-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { parseJobsFilter } from "@/lib/validation/jobs-filter";

export default async function CandidateJobsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/jobs">) {
  await pageLocale(params);
  const t = await getTranslations("candidate.jobs");
  const filter = parseJobsFilter(await searchParams);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Suspense fallback={<JobsBoardSkeleton />}>
        <JobsBoard filter={filter} basePath="/candidate/jobs" />
      </Suspense>
    </>
  );
}
