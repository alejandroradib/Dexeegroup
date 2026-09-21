import type { Database } from "@/types/database";

type Visibility = Database["public"]["Enums"]["candidate_visibility"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

/**
 * Statuses where a `dexee_only` application is waiting on Dexee to intermediate.
 *
 * RLS hides a `dexee_only` candidate from the company at every status, but only at
 * `applied` is nothing moving: the company was never notified, so the application sits
 * until Dexee reviews it and presents the candidate. Past that point Dexee has already
 * acted and the candidate can see the progress in the timeline, so the notice would only
 * add noise.
 */
export const DEXEE_HOLD_STATUSES: readonly ApplicationStatus[] = ["applied"];

/** True when the candidate should be told their application is waiting on Dexee. */
export function isOnDexeeHold(input: {
  visibility: Visibility | null | undefined;
  status: ApplicationStatus | string | null | undefined;
}): boolean {
  if (input.visibility !== "dexee_only") return false;
  return DEXEE_HOLD_STATUSES.includes(input.status as ApplicationStatus);
}

/** Whole days a held application has been waiting, floored, never negative. */
export function daysWaiting(createdAt: string | Date, now: Date = new Date()): number {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const ms = now.getTime() - created.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/** Past this many days a held application is overdue and the queue says so. */
export const DEXEE_HOLD_OVERDUE_DAYS = 3;
