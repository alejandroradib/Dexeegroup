import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";

export default async function CandidateDashboard({ params }: PageProps<"/[locale]/candidate">) {
  await pageLocale(params);
  const t = await getTranslations("nav.candidate");
  return <PageHeader title={t("dashboard")} />;
}
