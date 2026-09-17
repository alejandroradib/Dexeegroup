import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  OralResult,
  WorkstyleResult,
  WrittenResult,
} from "@/components/domain/assessments/result-views";
import { WorkstyleVisibilityToggle } from "@/components/domain/assessments/visibility-toggle";
import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAttemptWithQuestions } from "@/server/services/assessments";

export default async function ResultPage({
  params,
}: PageProps<"/[locale]/candidate/assessments/[type]/result/[attemptId]">) {
  const locale = await pageLocale(params);
  const { type, attemptId } = await params;
  const user = await getSessionUser();
  const data = await getAttemptWithQuestions(attemptId, user!.id);
  if (!data || data.assessment.type !== type) notFound();
  if (data.attempt.status === "in_progress")
    redirect({ href: `/candidate/assessments/${type}/attempt/${attemptId}`, locale });
  const [t, ti, to, tc] = await Promise.all([
    getTranslations("assessments.result"),
    getTranslations("assessments.intro"),
    getTranslations("assessments.oral"),
    getTranslations("common"),
  ]);
  const processing = ["submitted", "processing", "ai_scored"].includes(data.attempt.status);
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0">
        <Link href="/candidate/assessments">
          <ArrowLeftIcon /> {t("back")}
        </Link>
      </Button>
      <PageHeader
        title={ti(`${data.assessment.type}.title`)}
        eyebrow={t("title")}
        actions={
          <>
            <StatusChip kind="attempt" status={data.attempt.status} />
            {data.attempt.status === "validated" ? (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/assessments/${attemptId}/pdf`} target="_blank" rel="noreferrer">
                  <DownloadIcon /> {t("download")}
                </a>
              </Button>
            ) : null}
          </>
        }
      />
      {processing ? (
        <Alert variant="info">
          <p className="font-semibold">{to("processingTitle")}</p>
          <p className="mt-1">{to("processingBody")}</p>
        </Alert>
      ) : data.assessment.type === "english_written" ? (
        <WrittenResult attempt={data.attempt} />
      ) : data.assessment.type === "english_oral" ? (
        <OralResult attempt={data.attempt} />
      ) : (
        <WorkstyleResult
          attempt={data.attempt}
          visibilityControl={
            <WorkstyleVisibilityToggle
              attemptId={attemptId}
              initial={data.attempt.visible_to_companies}
            />
          }
        />
      )}
      <p className="text-muted-foreground mt-6 text-xs">{tc("consentNotice")}</p>
    </>
  );
}
