import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  firstIncompleteStep,
  OnboardingWizard,
} from "@/components/domain/candidate/onboarding/onboarding-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentCandidateProfile } from "@/server/services/candidates";
import { listSkillSuggestions } from "@/server/services/jobs";

export default async function CandidateOnboardingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/onboarding">) {
  await pageLocale(params);
  const query = await searchParams;
  const user = await getSessionUser();
  const [profile, suggestions, t] = await Promise.all([
    getCurrentCandidateProfile(user!.id),
    listSkillSuggestions(),
    getTranslations("candidate.onboarding"),
  ]);
  if (!profile) notFound();
  const requested = typeof query.step === "string" ? Number.parseInt(query.step, 10) : NaN;
  const initialStep =
    Number.isFinite(requested) && requested >= 0 && requested <= 6
      ? requested
      : firstIncompleteStep(profile);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <OnboardingWizard
        key={initialStep}
        profile={profile}
        suggestions={suggestions}
        initialStep={initialStep}
      />
    </>
  );
}
