import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { InterviewRunner } from "@/components/domain/interview/interview-runner";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getInterview } from "@/server/services/interviews";

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
  return (
    <>
      <PageHeader title={t("title")} eyebrow={te(`role_family.${interview.role_family}`)} />
      <InterviewRunner interview={interview} />
    </>
  );
}
