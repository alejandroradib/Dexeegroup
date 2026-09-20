/**
 * Response-time arithmetic for the lead queue (PHASES-GTM 9.4).
 *
 * The form promises a written answer within one business day. The queue measures against
 * that promise, so a lead is flagged the moment the promise is broken rather than later.
 *
 * Colombia does not observe daylight saving, so Bogotá is UTC-5 all year and the offset
 * can be applied arithmetically instead of through a timezone database.
 */

const BOGOTA_OFFSET_HOURS = -5;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 18;
const HOURS_PER_BUSINESS_DAY = DAY_END_HOUR - DAY_START_HOUR;

/** One business day, as promised next to the submit button. */
export const RESPONSE_SLA_BUSINESS_HOURS = HOURS_PER_BUSINESS_DAY;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Stops a bad timestamp from spinning the day loop. Nothing legitimate is this old. */
const MAX_DAYS = 400;

/** Same instant, shifted so UTC getters read as Bogotá wall-clock time. */
function toBogota(date: Date): Date {
  return new Date(date.getTime() + BOGOTA_OFFSET_HOURS * HOUR_MS);
}

function isWeekend(local: Date): boolean {
  const day = local.getUTCDay();
  return day === 0 || day === 6;
}

function startOfLocalDay(local: Date): number {
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

/**
 * Hours of Monday-to-Friday 09:00-18:00 Bogotá time between two instants.
 * Returns 0 when `to` is at or before `from`.
 */
export function businessHoursBetween(from: Date, to: Date): number {
  const start = toBogota(from).getTime();
  const end = toBogota(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  let total = 0;
  let cursor = startOfLocalDay(new Date(start));
  for (let day = 0; day < MAX_DAYS && cursor <= end; day += 1) {
    const local = new Date(cursor);
    if (!isWeekend(local)) {
      const open = cursor + DAY_START_HOUR * HOUR_MS;
      const close = cursor + DAY_END_HOUR * HOUR_MS;
      const overlap = Math.min(end, close) - Math.max(start, open);
      if (overlap > 0) total += overlap / HOUR_MS;
    }
    cursor += DAY_MS;
  }
  return Math.round(total * 100) / 100;
}

/** True once the one-business-day promise has been missed. */
export function isOverdue(createdAt: Date, now: Date = new Date()): boolean {
  return businessHoursBetween(createdAt, now) > RESPONSE_SLA_BUSINESS_HOURS;
}

/**
 * How long a lead has been waiting, or how long it took to answer.
 * `answeredAt` stops the clock; without it the clock runs to `now`.
 */
export function waitingBusinessHours(
  createdAt: Date,
  answeredAt: Date | null,
  now: Date = new Date(),
): number {
  return businessHoursBetween(createdAt, answeredAt ?? now);
}
