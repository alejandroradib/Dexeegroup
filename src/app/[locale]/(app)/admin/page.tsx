import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";

export default async function AdminDashboard({ params }: PageProps<"/[locale]/admin">) {
  await pageLocale(params);
  const t = await getTranslations("nav.admin");
  return <PageHeader title={t("dashboard")} />;
}
