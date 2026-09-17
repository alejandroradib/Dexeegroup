import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { OralRunner } from "@/components/domain/assessments/oral-runner";
import { WorkstyleRunner } from "@/components/domain/assessments/workstyle-runner";
import { WrittenRunner } from "@/components/domain/assessments/written-runner";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAttemptWithQuestions } from "@/server/services/assessments";

export default async function AttemptPage({ params }: PageProps<"/[locale]/candidate/assessments/[type]/attempt/[attemptId]">) {
  const locale = await pageLocale(params);
  const { type, attemptId } = await params;
  const user = await getSessionUser();
  const data = await getAttemptWithQuestions(attemptId, user!.id);
  if (!data || data.assessment.type !== type) notFound();
  const resultHref = `/candidate/assessments/${type}/result/${attemptId}`;
  if (data.attempt.status !== "in_progress") redirect({ href: resultHref, locale });
  const t = await getTranslations("assessments.intro");
  const maxBytes = ((data.assessment.config as { max_bytes?: number } | null)?.max_bytes) ?? 3 * 1024 * 1024;
  return (
    <>
      <PageHeader title={t(`${data.assessment.type}.title`)} />
      {data.assessment.type === "english_written" ? <WrittenRunner attempt={data.attempt} questions={data.questions} answers={data.answers} resultHref={resultHref} /> : null}
      {data.assessment.type === "psychometric" ? <WorkstyleRunner attempt={data.attempt} questions={data.questions} answers={data.answers} resultHref={resultHref} /> : null}
      {data.assessment.type === "english_oral" ? <OralRunner attempt={data.attempt} questions={data.questions} answers={data.answers} resultHref={resultHref} maxBytes={maxBytes} /> : null}
    </>
  );
}
