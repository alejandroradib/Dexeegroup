import { describe, expect, it } from "vitest";

import {
  DEXEE_HOLD_OVERDUE_DAYS,
  DEXEE_HOLD_STATUSES,
  daysWaiting,
  isOnDexeeHold,
} from "@/lib/candidates/dexee-hold";

/**
 * Guards CORRECCIONES-2 F2: a candidate in "Dexee only" mode used to apply and see
 * nothing telling them the company never receives the application directly. The notice
 * is driven by this predicate, so the predicate is what the test pins down.
 */
describe("dexee-only hold", () => {
  it("holds a fresh application from a dexee_only candidate", () => {
    expect(isOnDexeeHold({ visibility: "dexee_only", status: "applied" })).toBe(true);
  });

  it("never holds a candidate who is visible to companies", () => {
    for (const status of DEXEE_HOLD_STATUSES) {
      expect(isOnDexeeHold({ visibility: "visible_to_companies", status })).toBe(false);
    }
  });

  it("stops once Dexee has moved the application on", () => {
    for (const status of ["screening", "shortlisted", "interview", "hired", "rejected", "withdrawn"] as const) {
      expect(isOnDexeeHold({ visibility: "dexee_only", status })).toBe(false);
    }
  });

  it("treats a missing visibility or status as no hold", () => {
    expect(isOnDexeeHold({ visibility: null, status: "applied" })).toBe(false);
    expect(isOnDexeeHold({ visibility: undefined, status: "applied" })).toBe(false);
    expect(isOnDexeeHold({ visibility: "dexee_only", status: null })).toBe(false);
    expect(isOnDexeeHold({ visibility: "dexee_only", status: undefined })).toBe(false);
  });
});

describe("days waiting", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("floors to whole days", () => {
    expect(daysWaiting("2026-09-21T11:00:00.000Z", now)).toBe(0);
    expect(daysWaiting("2026-09-20T11:59:00.000Z", now)).toBe(1);
    expect(daysWaiting("2026-09-18T12:00:00.000Z", now)).toBe(3);
  });

  it("never reports a negative age for a clock skew or a future row", () => {
    expect(daysWaiting("2026-09-22T12:00:00.000Z", now)).toBe(0);
  });

  it("returns zero for an unparseable date instead of NaN", () => {
    expect(daysWaiting("not a date", now)).toBe(0);
  });

  it("marks an application overdue only past the threshold", () => {
    expect(daysWaiting("2026-09-19T12:00:00.000Z", now)).toBeLessThan(DEXEE_HOLD_OVERDUE_DAYS);
    expect(daysWaiting("2026-09-17T12:00:00.000Z", now)).toBeGreaterThan(DEXEE_HOLD_OVERDUE_DAYS);
  });
});
