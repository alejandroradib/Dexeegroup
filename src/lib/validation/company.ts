import { z } from "zod";

import { CEFR_LEVELS, COMPANY_SIZES, CONTRACT_TYPES, EMPLOYMENT_TYPES, ROLE_FAMILIES, SECTORS, SENIORITIES, TIMEZONE_OVERLAPS, WORK_MODES } from "@/lib/validation/enums";

const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const optionalUrl = z
  .string()
  .trim()
  .max(300, "tooLong")
  .refine((v) => v === "" || URL_PATTERN.test(v), "invalidUrl")
  .optional();
const optionalText = (max: number) => z.string().trim().max(max, "tooLong").optional();
const requiredInt = (min: number, max: number) => z.number({ error: "required" }).int("integer").min(min, "positive").max(max, "tooLong");

export const companyDetailsSchema = z.object({
  name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  legal_name: optionalText(160),
  website: optionalUrl,
  sector: z.enum(SECTORS).optional(),
  country: z.string().trim().length(2, "tooShort"),
  state: optionalText(80),
  city: optionalText(80),
  size: z.enum(COMPANY_SIZES).optional(),
  description: optionalText(1500),
});

export const hiringNeedsSchema = z.object({
  role_families: z.array(z.enum(ROLE_FAMILIES)).max(12),
  expected_hires: z.number("integer").int("integer").min(0, "positive").max(10000).optional(),
  preferred_contract_types: z.array(z.enum(CONTRACT_TYPES)).max(4),
});

export const companyOnboardingSchema = z.object({ details: companyDetailsSchema, hiring_needs: hiringNeedsSchema });

export const jobRoleStepSchema = z.object({
  title: z.string().trim().min(3, "tooShort").max(120, "tooLong"),
  role_family: z.enum(ROLE_FAMILIES, { error: "required" }),
  seniority: z.enum(SENIORITIES, { error: "required" }),
  description: z.string().trim().min(50, "tooShort").max(3000, "tooLong"),
  responsibilities: z.string().trim().min(20, "tooShort").max(3000, "tooLong"),
  requirements: z.string().trim().min(20, "tooShort").max(3000, "tooLong"),
  skills: z.array(z.string().trim().min(1).max(40)).min(1, "required").max(20),
  english_level_required: z.enum(CEFR_LEVELS, { error: "required" }),
});

export const jobCompensationStepSchema = z
  .object({
    salary_min_usd: requiredInt(0, 100000),
    salary_max_usd: requiredInt(0, 100000),
    show_salary: z.boolean(),
    contract_type: z.enum(CONTRACT_TYPES, { error: "required" }),
    employment_type: z.enum(EMPLOYMENT_TYPES, { error: "required" }),
    hours_per_week: requiredInt(1, 60),
    timezone_overlap: z.enum(TIMEZONE_OVERLAPS, { error: "required" }),
    work_mode: z.enum(WORK_MODES),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate").optional(),
    confidential_company: z.boolean(),
  })
  .refine((v) => v.salary_min_usd <= v.salary_max_usd, { path: ["salary_max_usd"], error: "salaryRange" });

/** Partial schema used by autosave: every field optional, still type-checked. */
export const jobDraftPatchSchema = jobRoleStepSchema.partial().extend({
  salary_min_usd: z.coerce.number().int().min(0).max(100000).optional(),
  salary_max_usd: z.coerce.number().int().min(0).max(100000).optional(),
  show_salary: z.boolean().optional(),
  contract_type: z.enum(CONTRACT_TYPES).optional(),
  employment_type: z.enum(EMPLOYMENT_TYPES).optional(),
  hours_per_week: z.coerce.number().int().min(1).max(60).optional(),
  timezone_overlap: z.enum(TIMEZONE_OVERLAPS).optional(),
  work_mode: z.enum(WORK_MODES).optional(),
  start_date: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable().optional()),
  confidential_company: z.boolean().optional(),
});

export const jobFullSchema = jobRoleStepSchema.and(jobCompensationStepSchema);

export const jobDraftRequestSchema = z.object({
  title: z.string().trim().min(3, "tooShort").max(120, "tooLong"),
  seniority: z.enum(SENIORITIES).optional(),
  role_family: z.enum(ROLE_FAMILIES).optional(),
  keywords: z.array(z.string().trim().min(1).max(40)).max(5),
});

export const teamInviteSchema = z.object({ email: z.email("invalidEmail").max(200) });

export const companyNoteSchema = z.object({ application_id: z.uuid(), body: z.string().trim().min(2, "tooShort").max(1000, "tooLong") });

export const notificationPrefsSchema = z.object({ digest: z.boolean(), application_updates: z.boolean() });

export type CompanyDetailsInput = z.infer<typeof companyDetailsSchema>;
export type HiringNeedsInput = z.infer<typeof hiringNeedsSchema>;
export type JobRoleStepInput = z.infer<typeof jobRoleStepSchema>;
export type JobCompensationStepInput = z.infer<typeof jobCompensationStepSchema>;
export type JobDraftPatch = z.infer<typeof jobDraftPatchSchema>;
export type TeamInviteInput = z.infer<typeof teamInviteSchema>;
