"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Stepper } from "@/components/shared/stepper";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import type { CandidateProfile } from "@/server/services/candidates";

import { CompensationStep } from "./compensation-step";
import { EducationStep } from "./education-step";
import { EnglishStep } from "./english-step";
import { ExperienceStep } from "./experience-step";
import { IdentityStep } from "./identity-step";
import { ProfessionalStep } from "./professional-step";
import { ResumeStep } from "./resume-step";

const STEP_IDS = ["identity", "professional", "experience", "education", "english", "compensation", "resume"] as const;

/** Picks the first incomplete step so a returning candidate resumes where they left off. */
export function firstIncompleteStep(profile: CandidateProfile): number {
  const c = profile.candidate;
  if (!c.city) return 0;
  if (!c.headline || !c.summary || !c.role_family || (c.skills ?? []).length < 3) return 1;
  if (profile.experience.length === 0) return 2;
  if (profile.education.length === 0) return 3;
  if (!c.english_self_level || (c.desired_roles ?? []).length === 0) return 4;
  if (c.desired_salary_min_usd === null || !c.availability) return 5;
  return 6;
}

export function OnboardingWizard({ profile, suggestions, initialStep }: { profile: CandidateProfile; suggestions: string[]; initialStep: number }) {
  const t = useTranslations("candidate.onboarding");
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(initialStep);
  const steps = STEP_IDS.map((id) => ({ id, label: t(`steps.${id}`) }));

  const next = () => setStep((s) => Math.min(s + 1, STEP_IDS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => {
    toast({ title: t("finished"), variant: "success" });
    router.push("/candidate");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Progress value={profile.candidate.profile_completeness} className="mb-4" aria-label={`${profile.candidate.profile_completeness}%`} />
      <Stepper steps={steps} current={step} onSelect={setStep} className="mb-6" />
      <div className="rounded-[12px] border border-border bg-white p-6">
        <h2 className="mb-5 text-lg">{steps[step]?.label}</h2>
        {step === 0 ? <IdentityStep profile={profile} onNext={next} /> : null}
        {step === 1 ? <ProfessionalStep profile={profile} suggestions={suggestions} onNext={next} onBack={back} /> : null}
        {step === 2 ? <ExperienceStep rows={profile.experience} onNext={next} onBack={back} /> : null}
        {step === 3 ? <EducationStep rows={profile.education} onNext={next} onBack={back} /> : null}
        {step === 4 ? <EnglishStep profile={profile} onNext={next} onBack={back} /> : null}
        {step === 5 ? <CompensationStep profile={profile} onNext={next} onBack={back} /> : null}
        {step === 6 ? <ResumeStep candidateId={profile.candidate.id} hasResume={Boolean(profile.contact?.resume_path)} onFinish={finish} onBack={back} finishLabel={t("finish")} /> : null}
      </div>
    </div>
  );
}
