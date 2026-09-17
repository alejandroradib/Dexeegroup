import { SearchXIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Alert } from "@/components/ui/alert";
import { PAGE_SIZE, totalPages } from "@/lib/pagination";
import type { JobsFilter } from "@/lib/validation/jobs-filter";
import { listPublicJobs } from "@/server/services/public-jobs";

import { JobCard } from "./job-card";
import { JobsFilters } from "./jobs-filters";

function withPage(filter: JobsFilter, page: number, basePath: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && key !== "page") params.set(key, String(value));
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

export async function JobsBoard({ filter, basePath }: { filter: JobsFilter; basePath: string }) {
  const t = await getTranslations("marketing.jobs");
  const tc = await getTranslations("common.errors");
  const result = await listPublicJobs(filter);

  return (
    <div className="space-y-6">
      <JobsFilters filter={filter} />
      {!result.ok ? (
        <Alert variant="danger">{tc("generic")}</Alert>
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {t("count", { count: result.data.total })}
          </p>
          {result.data.jobs.length === 0 ? (
            <EmptyState icon={SearchXIcon} title={t("emptyTitle")} description={t("emptyBody")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {result.data.jobs.map((job) => (
                <JobCard key={job.id} job={job} hrefBase={basePath} />
              ))}
            </div>
          )}
          <Pagination
            page={result.data.page}
            total={totalPages(result.data.total, PAGE_SIZE)}
            hrefFor={(p) => withPage(filter, p, basePath)}
          />
        </>
      )}
    </div>
  );
}
