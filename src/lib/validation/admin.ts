import { z } from "zod";

import { APPLICATION_STATUSES, CEFR_LEVELS, CONTRACT_TYPES } from "@/lib/validation/enums";

export const requestChangesSchema = z.object({ job_id: z.uuid(), message: z.string().trim().min(10, "tooShort").max(2000, "tooLong") });
export const verifyCompanySchema = z.object({ company_id: z.uuid(), publish_job_ids: z.array(z.uuid()).max(50) });
export const commercialsSchema = z.object({
  job_id: z.uuid(),
  client_bill_rate_usd: z.number().int("integer").min(0, "positive").max(100000).optional(),
  placement_fee_usd: z.number().int("integer").min(0, "positive").max(1000000).optional(),
  internal_notes: z.string().trim().max(2000, "tooLong").optional(),
});
export const candidateTagsSchema = z.object({ candidate_id: z.uuid(), tags: z.array(z.string().trim().min(1).max(40)).max(20) });
export const dexeeNoteSchema = z.object({ candidate_id: z.uuid(), application_id: z.uuid().optional(), body: z.string().trim().min(2, "tooShort").max(2000, "tooLong") });
export const applicationStatusSchema = z.object({ application_id: z.uuid(), status: z.enum(APPLICATION_STATUSES), note: z.string().trim().max(500).optional() });
export const recommendSchema = z.object({ candidate_id: z.uuid(), job_id: z.uuid() });
export const placementSchema = z
  .object({
    application_id: z.uuid(),
    contract_type: z.enum(CONTRACT_TYPES, { error: "required" }),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate"),
    monthly_salary_usd: z.number({ error: "required" }).int("integer").min(0, "positive").max(100000),
    monthly_bill_rate_usd: z.number({ error: "required" }).int("integer").min(0, "positive").max(200000),
  });
export const endPlacementSchema = z.object({ placement_id: z.uuid(), end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate") });
export const adminInviteSchema = z.object({ email: z.email("invalidEmail").max(200), full_name: z.string().trim().min(2, "tooShort").max(120, "tooLong") });
export const validateAttemptSchema = z.object({
  attempt_id: z.uuid(),
  final_level: z.enum(CEFR_LEVELS).optional(),
  pronunciation: z.number().int().min(0).max(5).optional(),
  intelligibility: z.number().int().min(0).max(5).optional(),
  comment: z.string().trim().max(1000, "tooLong").optional(),
});
export const rejectAttemptSchema = z.object({ attempt_id: z.uuid(), comment: z.string().trim().min(3, "tooShort").max(1000, "tooLong") });
export const assessmentConfigSchema = z.object({ assessment_id: z.uuid(), config: z.string().min(2), is_active: z.boolean(), cooldown_days: z.number().int().min(1).max(365), time_limit_minutes: z.number().int().min(1).max(1440).nullable() });

export type RequestChangesInput = z.infer<typeof requestChangesSchema>;
export type CommercialsInput = z.infer<typeof commercialsSchema>;
export type PlacementInput = z.infer<typeof placementSchema>;
export type AdminInviteInput = z.infer<typeof adminInviteSchema>;
export type ValidateAttemptInput = z.infer<typeof validateAttemptSchema>;
export type AssessmentConfigInput = z.infer<typeof assessmentConfigSchema>;
