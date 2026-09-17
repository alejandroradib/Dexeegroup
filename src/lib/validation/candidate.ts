import { z } from "zod";

import { AVAILABILITIES, CEFR_LEVELS, CONTRACT_TYPES, ROLE_FAMILIES } from "@/lib/validation/enums";

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const optionalUrl = z.string().trim().max(300, "tooLong").refine((v) => v === "" || URL_PATTERN.test(v), "invalidUrl").optional();

export const identityStepSchema = z.object({
  first_name: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  last_name: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  city: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  phone: z.string().trim().max(30, "tooLong").optional(),
  linkedin_url: optionalUrl,
  portfolio_url: optionalUrl,
});

export const professionalStepSchema = z.object({
  headline: z.string().trim().min(5, "tooShort").max(120, "tooLong"),
  summary: z.string().trim().min(40, "tooShort").max(1500, "tooLong"),
  role_family: z.enum(ROLE_FAMILIES, { error: "required" }),
  skills: z.array(z.string().trim().min(1).max(40)).min(3, "minSkills").max(25),
  years_experience: z.number({ error: "required" }).min(0, "positive").max(60),
});

export const experienceSchema = z
  .object({
    id: z.string().uuid().optional(),
    company: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
    title: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
    start_date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "invalidDate"),
    end_date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "invalidDate").optional().or(z.literal("")),
    is_current: z.boolean(),
    description: z.string().trim().max(800, "tooLong").optional(),
  })
  .refine((v) => v.is_current || (v.end_date && v.end_date >= v.start_date), { path: ["end_date"], error: "endBeforeStart" });

export const educationSchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().trim().min(2, "tooShort").max(160, "tooLong"),
  degree: z.string().trim().max(120, "tooLong").optional(),
  field: z.string().trim().max(120, "tooLong").optional(),
  start_year: z.number().int("integer").min(1950).max(2100).optional(),
  end_year: z.number().int("integer").min(1950).max(2100).optional(),
});

export const englishStepSchema = z.object({
  english_self_level: z.enum(CEFR_LEVELS, { error: "required" }),
  desired_roles: z.array(z.string().trim().min(1).max(60)).min(1, "required").max(10),
});

export const compensationStepSchema = z.object({
  desired_salary_min_usd: z.number({ error: "required" }).int("integer").min(0, "positive").max(100000),
  availability: z.enum(AVAILABILITIES, { error: "required" }),
  preferred_contract_types: z.array(z.enum(CONTRACT_TYPES)).min(1, "required").max(4),
});

export const applySchema = z.object({
  job_id: z.string().uuid(),
  cover_note: z.string().trim().max(600, "maxLength").optional(),
});

export const dataRequestSchema = z.object({
  kind: z.enum(["access", "correction", "deletion"]),
  message: z.string().trim().max(1000, "tooLong").optional(),
});

export const accountSchema = z.object({
  full_name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  locale: z.enum(["en", "es"]),
});

export const changePasswordSchema = z
  .object({ password: z.string().min(8, "passwordMin").max(128, "tooLong"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "passwordMatch" });

export type IdentityStepInput = z.infer<typeof identityStepSchema>;
export type ProfessionalStepInput = z.infer<typeof professionalStepSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type EnglishStepInput = z.infer<typeof englishStepSchema>;
export type CompensationStepInput = z.infer<typeof compensationStepSchema>;
export type ApplyInput = z.infer<typeof applySchema>;
export type DataRequestInput = z.infer<typeof dataRequestSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
