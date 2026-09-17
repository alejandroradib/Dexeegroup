import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";

export default async function CompanyDashboard({ params }: PageProps<"/[locale]/company">) {
  await pageLocale(params);
  const t = await getTranslations("nav.company");
  return <PageHeader title={t("dashboard")} />;
}
