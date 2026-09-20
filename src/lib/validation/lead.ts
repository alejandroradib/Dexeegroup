import { z } from "zod";

/**
 * Qualified inbound lead (PHASES-GTM 9.4). Six fields, no phone: every extra field costs
 * completions, and Dexee answers by email anyway.
 *
 * Shared by the client form and the server action. The budget and timing options are a
 * fixed choice, not free text, so the admin queue can filter on them; the same values are
 * checked in the database by `contact_requests_budget_band_check` and
 * `contact_requests_needed_by_check`.
 */

export const BUDGET_BANDS = ["under_2k", "2k_4k", "4k_7k", "7k_plus", "not_sure"] as const;
export const NEEDED_BY = ["immediate", "one_month", "quarter", "exploring"] as const;

export type BudgetBand = (typeof BUDGET_BANDS)[number];
export type NeededBy = (typeof NEEDED_BY)[number];

export const leadSchema = z.object({
  name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  email: z.email("invalidEmail").max(200),
  company: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  role_to_fill: z.string().trim().min(2, "tooShort").max(160, "tooLong"),
  seniority: z.enum(["junior", "mid", "senior", "lead"]),
  budget_band: z.enum(BUDGET_BANDS),
  needed_by: z.enum(NEEDED_BY),
  /** Honeypot. A real visitor never fills this; a bot fills every field it finds. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type LeadInput = z.infer<typeof leadSchema>;
