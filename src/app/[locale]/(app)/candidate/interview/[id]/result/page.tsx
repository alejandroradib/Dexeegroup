import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { InterviewReportView } from "@/components/domain/interview/interview-report";
import { RetryInterviewButton } from "@/components/domain/interview/retry-button";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getInterview } from "@/server/services/interviews";

export default async function InterviewResultPage({
  params,
}: PageProps<"/[locale]/candidate/interview/[id]/result">) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const user = await getSessionUser();
  const [interview, t, te] = await Promise.all([
    getInterview(user!.id, id),
    getTranslations("interview"),
    getTranslations("enums"),
  ]);
  if (!interview) notFound();
  if (interview.status === "in_progress") redirect({ href: `/candidate/interview/${id}`, locale });
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0">
        <Link href="/candidate/interview">
          <ArrowLeftIcon /> {t("title")}
        </Link>
      </Button>
      <PageHeader
        title={t("report.title")}
        eyebrow={te(`role_family.${interview.role_family}`)}
        actions={
          <Button asChild variant="outline">
            <Link href="/candidate/interview">{t("report.practiceAgain")}</Link>
          </Button>
        }
      />
      {interview.status === "failed" ? (
        <div className="grid gap-4">
          <Alert variant="danger">{t("report.failed")}</Alert>
          {interview.processing_attempts < 3 ? (
            <RetryInterviewButton interviewId={interview.id} />
          ) : null}
        </div>
      ) : (
        <InterviewReportView interview={interview} />
      )}
    </>
  );
}
