export const MAX_SEND_ATTEMPTS = 5;

/** Exponential backoff in minutes: 2, 4, 8, 16, 32, capped at 60. */
export function backoffMinutes(attempt: number): number {
  return Math.min(60, 2 ** Math.max(1, attempt));
}
