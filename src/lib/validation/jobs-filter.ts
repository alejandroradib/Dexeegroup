import { z } from "zod";

import { CEFR_LEVELS, CONTRACT_TYPES, ROLE_FAMILIES, SENIORITIES, WORK_MODES } from "@/lib/validation/enums";

export const jobsFilterSchema = z.object({
  q: z.string().trim().max(80).optional(),
  role_family: z.enum(ROLE_FAMILIES).optional(),
  seniority: z.enum(SENIORITIES).optional(),
  contract_type: z.enum(CONTRACT_TYPES).optional(),
  work_mode: z.enum(WORK_MODES).optional(),
  min_salary: z.coerce.number().int().min(0).max(100000).optional(),
  english_level: z.enum(CEFR_LEVELS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export type JobsFilter = z.infer<typeof jobsFilterSchema>;

/** Parses URL search params leniently: invalid values are dropped instead of failing the page. */
export function parseJobsFilter(params: Record<string, string | string[] | undefined>): JobsFilter {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined && v !== "") flat[key] = v;
  }
  const result: JobsFilter = {};
  for (const key of Object.keys(jobsFilterSchema.shape) as (keyof JobsFilter)[]) {
    const single = jobsFilterSchema.shape[key].safeParse(flat[key]);
    if (single.success && single.data !== undefined) {
      (result as Record<string, unknown>)[key] = single.data;
    }
  }
  return result;
}
