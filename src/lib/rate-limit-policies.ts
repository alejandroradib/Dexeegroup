/**
 * Ceilings on model calls a company user can trigger (audit I13). Each feature is limited per
 * user and per company, so one account cannot spend the AI budget alone and one company cannot
 * spend it through many accounts. Operational values, adjustable here without a migration.
 */
export type RateWindow = { limit: number; windowSeconds: number };

export const AI_LIMITS: Record<"job_draft" | "job_fit", { user: RateWindow; company: RateWindow }> =
  {
    job_draft: {
      user: { limit: 20, windowSeconds: 3600 },
      company: { limit: 60, windowSeconds: 86_400 },
    },
    job_fit: {
      user: { limit: 10, windowSeconds: 3600 },
      company: { limit: 30, windowSeconds: 86_400 },
    },
  };
