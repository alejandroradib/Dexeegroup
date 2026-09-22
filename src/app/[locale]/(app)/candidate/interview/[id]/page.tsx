import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { InterviewChat } from "@/components/domain/interview/interview-chat";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getInterview, listInterviewJobOptions } from "@/server/services/interviews";

export default async function InterviewRunnerPage({
  params,
}: PageProps<"/[locale]/candidate/interview/[id]">) {
  const locale = await pageLocale(params);
  const { id } = await params;
  const user = await getSessionUser();
  const [interview, t, te] = await Promise.all([
    getInterview(user!.id, id),
    getTranslations("interview"),
    getTranslations("enums"),
  ]);
  if (!interview) notFound();
  if (interview.status !== "in_progress")
    redirect({ href: `/candidate/interview/${id}/result`, locale });
  const job = interview.job_id
    ? (await listInterviewJobOptions(user!.id, interview.job_id)).find(
        (j) => j.id === interview.job_id,
      )
    : undefined;
  return (
    <>
      <PageHeader
        title={job ? t("chat.titleForJob", { job: job.title }) : t("title")}
        eyebrow={te(`role_family.${interview.role_family}`)}
        description={t(interview.language === "en" ? "chat.inEnglish" : "chat.inSpanish")}
      />
      <InterviewChat interview={interview} />
    </>
  );
}
