import { getTranslations } from "next-intl/server";

import { AssessmentConfigForm } from "@/components/domain/admin/assessment-config-form";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { CONSENT_VERSION } from "@/lib/legal";
import { listAssessmentsAdmin } from "@/server/services/admin";

export default async function AdminSettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  await pageLocale(params);
  const [t, assessments] = await Promise.all([getTranslations("admin.settings"), listAssessmentsAdmin()]);
  return (
    <>
      <PageHeader title={t("title")} />
      <section className="mb-8 rounded-[12px] border border-border bg-white p-5">
        <h2 className="text-base">{t("consent")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("consentBody", { version: CONSENT_VERSION })}</p>
      </section>
      <h2 className="mb-1 text-lg">{t("assessments")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("assessmentsBody")}</p>
      <div className="grid gap-6 xl:grid-cols-3">
        {assessments.map((a) => <AssessmentConfigForm key={a.id} assessment={a} />)}
      </div>
    </>
  );
}
