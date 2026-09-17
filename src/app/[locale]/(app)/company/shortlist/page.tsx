import { BookmarkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ApplicantsTable } from "@/components/domain/company/applicants-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/server/services/companies";
import { listCompanyApplicants } from "@/server/services/jobs";

export default async function ShortlistPage({ params }: PageProps<"/[locale]/company/shortlist">) {
  const locale = await pageLocale(params);
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const t = await getTranslations("company.shortlist");
  const supabase = await createClient();
  const { data: saved } = await supabase.from("saved_candidates").select("candidate_id").eq("company_id", company!.id);
  const savedIds = new Set((saved ?? []).map((s) => s.candidate_id));
  const { rows } = await listCompanyApplicants(company!.id, {}, { from: 0, to: 199 });
  const shortlisted = rows.filter((r) => savedIds.has(r.application.candidate_id));
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ApplicantsTable rows={shortlisted} emptyState={<EmptyState icon={BookmarkIcon} title={t("empty")} description={t("emptyBody")} />} />
    </>
  );
}
