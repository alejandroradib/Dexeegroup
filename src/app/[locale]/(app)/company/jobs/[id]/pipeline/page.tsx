import { ArrowLeftIcon, UsersIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { KanbanBoard } from "@/components/domain/company/kanban-board";
import { RecommendedPanel } from "@/components/domain/company/recommended-panel";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getCurrentCompany } from "@/server/services/companies";
import { getPipeline } from "@/server/services/jobs";

export default async function PipelinePage({
  params,
  searchParams,
}: PageProps<"/[locale]/company/jobs/[id]/pipeline">) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const query = await searchParams;
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const [t, tj, result] = await Promise.all([
    getTranslations("company.pipeline"),
    getTranslations("company.jobs.actions"),
    getPipeline(id, company!.id),
  ]);
  if (!result.ok) notFound();
  const { job, cards } = result.data;
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0">
        <Link href="/company/jobs">
          <ArrowLeftIcon /> {t("back")}
        </Link>
      </Button>
      <PageHeader
        title={job.title}
        eyebrow={t("title")}
        actions={
          <>
            <StatusChip kind="job" status={job.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/company/jobs/${job.id}/edit`}>{tj("edit")}</Link>
            </Button>
          </>
        }
      />
      {cards.length === 0 ? (
        <EmptyState icon={UsersIcon} title={t("empty")} description={t("emptyBody")} />
      ) : (
        <>
          <RecommendedPanel
            jobId={job.id}
            cards={cards}
            onOpen={(applicationId) => `?application=${applicationId}`}
          />
          <KanbanBoard
            cards={cards}
            initialOpen={typeof query.application === "string" ? query.application : null}
          />
        </>
      )}
    </>
  );
}
