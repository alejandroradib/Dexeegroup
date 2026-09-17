import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { StartAssessmentButton } from "@/components/domain/assessments/start-button";
import { ChevronList } from "@/components/domain/marketing/sections";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { ASSESSMENT_TYPES } from "@/lib/validation/enums";
import type { AssessmentType } from "@/server/services/assessments";
import { getAssessmentHub } from "@/server/services/candidates";

export default async function AssessmentIntroPage({
  params,
}: PageProps<"/[locale]/candidate/assessments/[type]">) {
  await pageLocale(params);
  const { type } = await params;
  if (!(ASSESSMENT_TYPES as readonly string[]).includes(type)) notFound();
  const user = await getSessionUser();
  const [items, t, tc, format] = await Promise.all([
    getAssessmentHub(user!.id),
    getTranslations("assessments.intro"),
    getTranslations("common"),
    getFormatter(),
  ]);
  const item = items.find((i) => i.assessment.type === type);
  if (!item) notFound();
  const kind = type as AssessmentType;
  const cooldownActive = item.nextAllowedAt && new Date(item.nextAllowedAt) > new Date();
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0">
        <Link href="/candidate/assessments">
          <ArrowLeftIcon /> {t("back")}
        </Link>
      </Button>
      <PageHeader title={t(`${kind}.title`)} description={t(`${kind}.body`)} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="border-border rounded-[12px] border bg-white p-6">
          <h2 className="text-base">{t("rules")}</h2>
          <ChevronList
            className="mt-4 text-sm"
            items={[t(`${kind}.rule1`), t(`${kind}.rule2`), t(`${kind}.rule3`), t(`${kind}.rule4`)]}
          />
          <p className="text-muted-foreground mt-6 text-xs">{tc("consentNotice")}</p>
        </section>
        <aside className="grid gap-3 self-start">
          {item.open ? (
            <Button asChild variant="accent" size="lg">
              <Link href={`/candidate/assessments/${type}/attempt/${item.open.id}`}>
                {tc("actions.continue")}
              </Link>
            </Button>
          ) : cooldownActive ? (
            <Alert variant="warning">
              {t("cooldown", {
                date: format.dateTime(new Date(item.nextAllowedAt as string), "long"),
              })}
            </Alert>
          ) : (
            <StartAssessmentButton type={type} />
          )}
          {item.latest?.status === "validated" ? (
            <Button asChild variant="outline">
              <Link href={`/candidate/assessments/${type}/result/${item.latest.id}`}>
                {tc("actions.view")}
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </>
  );
}
