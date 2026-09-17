/**
 * Mirrors public.compute_profile_completeness (supabase/migrations) so the UI can show the
 * checklist without a round trip. Keep the weights in sync with the SQL function.
 */
export type CompletenessInput = {
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  english_self_level: string | null;
  desired_salary_min_usd: number | null;
  availability: string | null;
  experience_count: number;
  education_count: number;
  has_resume: boolean;
};

export type CompletenessItem = {
  key: "identity" | "summary" | "experience" | "education" | "skills" | "english" | "compensation" | "resume";
  weight: number;
  done: boolean;
};

const filled = (value: string | null | undefined) => Boolean(value && value.trim() !== "");

export function completenessChecklist(input: CompletenessInput): CompletenessItem[] {
  return [
    { key: "identity", weight: 15, done: filled(input.first_name) && filled(input.last_name) && filled(input.headline) },
    { key: "summary", weight: 10, done: filled(input.summary) },
    { key: "experience", weight: 20, done: input.experience_count > 0 },
    { key: "education", weight: 10, done: input.education_count > 0 },
    { key: "skills", weight: 15, done: input.skills.length >= 3 },
    { key: "english", weight: 10, done: input.english_self_level !== null },
    { key: "compensation", weight: 10, done: input.desired_salary_min_usd !== null && input.availability !== null },
    { key: "resume", weight: 10, done: input.has_resume },
  ];
}

export function computeCompleteness(input: CompletenessInput): number {
  const score = completenessChecklist(input).reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return Math.min(100, score);
}
