import { describe, expect, it } from "vitest";

import {
  RESPONSE_SLA_BUSINESS_HOURS,
  businessHoursBetween,
  isOverdue,
  waitingBusinessHours,
} from "@/lib/leads/response-time";
import { BUDGET_BANDS, NEEDED_BY, leadSchema } from "@/lib/validation/lead";

/** Bogotá is UTC-5 all year, so 14:00Z is 09:00 local, the start of the business day. */
const bogota = (iso: string) => new Date(`${iso}Z`);

const VALID = {
  name: "Dana Whitfield",
  email: "dana@northstar.com",
  company: "Northstar Logistics",
  role_to_fill: "Customer support lead",
  seniority: "senior",
  budget_band: "2k_4k",
  needed_by: "one_month",
};

describe("lead validation", () => {
  it("accepts the six fields the form collects", () => {
    expect(leadSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects an invalid email with a message key, not a sentence", () => {
    const result = leadSchema.safeParse({ ...VALID, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("invalidEmail");
    }
  });

  it("rejects a budget band or timing that is not one of the published options", () => {
    expect(leadSchema.safeParse({ ...VALID, budget_band: "negotiable" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...VALID, needed_by: "someday" }).success).toBe(false);
  });

  it("never asks for a phone number", () => {
    const withPhone = leadSchema.safeParse({ ...VALID, phone: "+57 300 000 0000" });
    expect(withPhone.success).toBe(true);
    if (withPhone.success) expect(withPhone.data).not.toHaveProperty("phone");
  });

  it("treats a filled honeypot as a schema-valid submission the action then drops", () => {
    expect(leadSchema.safeParse({ ...VALID, website: "" }).success).toBe(true);
    expect(leadSchema.safeParse({ ...VALID, website: "http://spam" }).success).toBe(false);
  });

  it("keeps the option lists in step with what the database accepts", () => {
    expect(BUDGET_BANDS).toEqual(["under_2k", "2k_4k", "4k_7k", "7k_plus", "not_sure"]);
    expect(NEEDED_BY).toEqual(["immediate", "one_month", "quarter", "exploring"]);
  });
});

describe("business hours", () => {
  it("counts only the hours inside the working day", () => {
    // Tuesday 09:00 to 12:00 Bogotá.
    expect(businessHoursBetween(bogota("2026-09-15T14:00:00"), bogota("2026-09-15T17:00:00"))).toBe(
      3,
    );
  });

  it("ignores the hours before the day opens and after it closes", () => {
    // Tuesday 06:00 to 22:00 Bogotá spans the whole nine-hour day, no more.
    expect(businessHoursBetween(bogota("2026-09-15T11:00:00"), bogota("2026-09-16T03:00:00"))).toBe(
      9,
    );
  });

  it("skips the weekend", () => {
    // Friday 17:00 to Monday 10:00 Bogotá: one hour Friday plus one hour Monday.
    expect(businessHoursBetween(bogota("2026-09-18T22:00:00"), bogota("2026-09-21T15:00:00"))).toBe(
      2,
    );
  });

  it("returns zero when the end is at or before the start", () => {
    expect(businessHoursBetween(bogota("2026-09-15T14:00:00"), bogota("2026-09-15T14:00:00"))).toBe(
      0,
    );
    expect(businessHoursBetween(bogota("2026-09-15T18:00:00"), bogota("2026-09-15T14:00:00"))).toBe(
      0,
    );
  });

  it("returns zero for a span that falls entirely outside working hours", () => {
    // Saturday afternoon.
    expect(businessHoursBetween(bogota("2026-09-19T18:00:00"), bogota("2026-09-19T23:00:00"))).toBe(
      0,
    );
  });
});

describe("the one-business-day promise", () => {
  it("is not broken while the lead is still inside its first business day", () => {
    // Tuesday 09:00, checked Tuesday 17:00: eight business hours.
    expect(isOverdue(bogota("2026-09-15T14:00:00"), bogota("2026-09-15T22:00:00"))).toBe(false);
  });

  it("is broken once a full business day has passed", () => {
    // Tuesday 09:00, checked Wednesday 10:00: nine hours Tuesday plus one Wednesday.
    expect(isOverdue(bogota("2026-09-15T14:00:00"), bogota("2026-09-16T15:00:00"))).toBe(true);
  });

  it("is not broken by a weekend alone", () => {
    // Friday 16:00, checked Monday 09:00: two business hours.
    expect(isOverdue(bogota("2026-09-18T21:00:00"), bogota("2026-09-21T14:00:00"))).toBe(false);
  });

  it("matches the nine-hour working day the helper is built on", () => {
    expect(RESPONSE_SLA_BUSINESS_HOURS).toBe(9);
  });
});

describe("waiting time", () => {
  it("stops the clock when the lead was answered", () => {
    const created = bogota("2026-09-15T14:00:00");
    const answered = bogota("2026-09-15T17:00:00");
    const muchLater = bogota("2026-09-25T14:00:00");
    expect(waitingBusinessHours(created, answered, muchLater)).toBe(3);
  });

  it("runs to now while the lead is unanswered", () => {
    const created = bogota("2026-09-15T14:00:00");
    expect(waitingBusinessHours(created, null, bogota("2026-09-15T16:00:00"))).toBe(2);
  });
});
