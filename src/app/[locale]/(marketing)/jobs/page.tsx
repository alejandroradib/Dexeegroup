import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { JobsBoard } from "@/components/domain/jobs/jobs-board";
import { JobsBoardSkeleton } from "@/components/domain/jobs/jobs-board-skeleton";
import { pageLocale } from "@/i18n/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { parseJobsFilter } from "@/lib/validation/jobs-filter";

import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/[locale]/jobs">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("jobs"),
    description: t("jobsDescription"),
    alternates: buildAlternates(locale, "/jobs"),
  };
}

export default async function JobsPage({ params, searchParams }: PageProps<"/[locale]/jobs">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.jobs");
  const filter = parseJobsFilter(await searchParams);

  return (
    <div className="container-marketing py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3">{t("subtitle")}</p>
      </div>
      <Suspense fallback={<JobsBoardSkeleton />}>
        <JobsBoard filter={filter} basePath="/jobs" />
      </Suspense>
    </div>
  );
}
