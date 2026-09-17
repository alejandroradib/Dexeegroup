import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ApplyButton } from "@/components/domain/candidate/apply-button";
import { JobDetail } from "@/components/domain/jobs/job-detail";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCandidateApplicationForJob,
  getCurrentCandidateProfile,
} from "@/server/services/candidates";
import { getPublicJobBySlug } from "@/server/services/public-jobs";

export default async function CandidateJobPage({
  params,
}: PageProps<"/[locale]/candidate/jobs/[slug]">) {
  await pageLocale(params);
  const { slug } = await params;
  const result = await getPublicJobBySlug(slug);
  if (!result.ok || !result.data) notFound();
  const job = result.data;
  const user = await getSessionUser();
  const [existing, profile, t] = await Promise.all([
    getCandidateApplicationForJob(user!.id, job.id ?? ""),
    getCurrentCandidateProfile(user!.id),
    getTranslations("marketing.jobs"),
  ]);
  return (
    <>
      <Button asChild variant="link" className="mb-4 px-0">
        <Link href="/candidate/jobs">
          <ArrowLeftIcon /> {t("backToJobs")}
        </Link>
      </Button>
      <div className="border-border rounded-[12px] border bg-white p-6">
        <JobDetail
          job={job}
          applyAction={
            <ApplyButton
              jobId={job.id ?? ""}
              jobTitle={job.title ?? ""}
              existing={existing}
              profileComplete={(profile?.candidate.profile_completeness ?? 0) >= 60}
            />
          }
        />
      </div>
    </>
  );
}
