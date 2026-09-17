import { ClipboardCheckIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { JobCard } from "@/components/domain/jobs/job-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { completenessChecklist } from "@/lib/profile/completeness";
import {
  getCurrentCandidateProfile,
  listCandidateApplications,
  listRecommendedJobs,
} from "@/server/services/candidates";

export default async function CandidateDashboardPage({ params }: PageProps<"/[locale]/candidate">) {
  await pageLocale(params);
  const user = await getSessionUser();
  const profile = await getCurrentCandidateProfile(user!.id);
  if (!profile) notFound();
  const [t, tk, applications, recommended] = await Promise.all([
    getTranslations("candidate.dashboard"),
    getTranslations("candidate.checklist"),
    listCandidateApplications(user!.id),
    listRecommendedJobs(profile.candidate),
  ]);
  const checklist = completenessChecklist({
    first_name: profile.candidate.first_name,
    last_name: profile.candidate.last_name,
    headline: profile.candidate.headline,
    summary: profile.candidate.summary,
    skills: profile.candidate.skills,
    english_self_level: profile.candidate.english_self_level,
    desired_salary_min_usd: profile.candidate.desired_salary_min_usd,
    availability: profile.candidate.availability,
    experience_count: profile.experience.length,
    education_count: profile.education.length,
    has_resume: Boolean(profile.contact?.resume_path),
  });
  const missing = checklist.filter((i) => !i.done).map((i) => tk(i.key));
  const completeness = profile.candidate.profile_completeness;

  return (
    <>
      <PageHeader title={t("welcome", { name: profile.candidate.first_name })} />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="border-border rounded-[12px] border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base">{t("completeness")}</h2>
            <span className="font-heading text-navy text-2xl font-bold">{completeness}%</span>
          </div>
          <Progress value={completeness} className="mt-3" />
          {missing.length > 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              {t("missing", { items: missing.join(", ") })}
            </p>
          ) : null}
          {completeness < 100 ? (
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/candidate/onboarding">{t("completeProfile")}</Link>
            </Button>
          ) : null}
        </section>
        <section className="bg-navy rounded-[12px] p-5 text-white">
          <ClipboardCheckIcon className="text-green size-6" aria-hidden />
          <h2 className="mt-3 text-base text-white">{t("assessments")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("assessmentsPrompt")}</p>
          <Button asChild variant="accent" size="sm" className="mt-4">
            <Link href="/candidate/assessments">{t("goToAssessments")}</Link>
          </Button>
        </section>
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">{t("recommended")}</h2>
          <Link href="/candidate/jobs" className="text-link text-sm hover:underline">
            {t("browseAll")}
          </Link>
        </div>
        {recommended.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-[12px] border border-dashed bg-white p-6 text-sm">
            {t("recommendedEmpty")}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((job) => (
              <JobCard key={job.id} job={job} hrefBase="/candidate/jobs" />
            ))}
          </div>
        )}
      </section>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">{t("applications")}</h2>
          <Link href="/candidate/applications" className="text-link text-sm hover:underline">
            {t("viewApplications")}
          </Link>
        </div>
        {applications.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-[12px] border border-dashed bg-white p-6 text-sm">
            {t("applicationsEmpty")}
          </p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-[12px] border bg-white">
            {applications.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="text-navy font-medium">{a.job?.title ?? "—"}</p>
                  <p className="text-muted-foreground text-xs">{a.job?.company_name}</p>
                </div>
                <StatusChip kind="application" status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
