import { redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { createDraftJob } from "@/server/actions/company";
import { getCurrentCompany } from "@/server/services/companies";

/** Creates an empty draft and opens the wizard so every step autosaves against a real row. */
export default async function NewJobPage({ params }: PageProps<"/[locale]/company/jobs/new">) {
  const locale = await pageLocale(params);
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const result = await createDraftJob();
  if (!result.ok) redirect({ href: "/company/jobs", locale });
  redirect({
    href: `/company/jobs/${(result as { ok: true; data: { jobId: string } }).data.jobId}/edit`,
    locale,
  });
}
