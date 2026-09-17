import { getTranslations } from "next-intl/server";

import { CompanyOnboardingForm } from "@/components/domain/company/company-onboarding-form";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/server/services/companies";

export default async function CompanyOnboardingPage({ params }: PageProps<"/[locale]/company/onboarding">) {
  await pageLocale(params);
  const t = await getTranslations("company.onboarding");
  const [company, user] = await Promise.all([getCurrentCompany(), getSessionUser()]);
  let defaultName = "";
  if (!company && user) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    defaultName = (data.user?.user_metadata?.company_name as string | undefined) ?? "";
  }
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <CompanyOnboardingForm company={company} defaultName={defaultName} />
    </>
  );
}
