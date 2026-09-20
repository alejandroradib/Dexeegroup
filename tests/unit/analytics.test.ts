import { describe, expect, it } from "vitest";

import { ANALYTICS_EVENTS, sanitizeProps, track } from "@/lib/analytics/events";

describe("event catalogue", () => {
  it("is exactly the nine events PHASES-GTM 9.7 asks for", () => {
    expect([...ANALYTICS_EVENTS].sort()).toEqual(
      [
        "apply_job",
        "complete_assessment",
        "start_candidate_signup",
        "start_lead_form",
        "submit_lead",
        "use_calculator",
        "view_job",
        "view_pricing",
        "view_sample_report",
      ].sort(),
    );
  });

  it("has no duplicates", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });
});

describe("property sanitizing", () => {
  it("drops anything that could identify a person", () => {
    expect(
      sanitizeProps({
        email: "dana@northstar.com",
        name: "Dana",
        company: "Northstar",
        candidate_id: "a0000000-0000-4000-8000-000000000001",
        phone: "+57 300 000 0000",
        seniority: "senior",
      }),
    ).toEqual({ seniority: "senior" });
  });

  it("drops free text, keeping only values short enough to be a category", () => {
    const long = "a".repeat(41);
    expect(sanitizeProps({ note: long, band: "2k_4k" })).toEqual({ band: "2k_4k" });
  });

  it("drops anything that looks like an address even under an innocent key", () => {
    expect(sanitizeProps({ source: "dana@northstar.com" })).toEqual({});
  });

  it("keeps counts and flags", () => {
    expect(sanitizeProps({ months: 12, provisional: true })).toEqual({
      months: 12,
      provisional: true,
    });
  });

  it("drops NaN rather than sending it", () => {
    expect(sanitizeProps({ months: Number.NaN })).toEqual({});
  });

  it("handles no properties at all", () => {
    expect(sanitizeProps(undefined)).toEqual({});
  });
});

describe("track", () => {
  it("does nothing and reports nothing when no provider is loaded", () => {
    // jsdom is not configured for these tests, so `window` is undefined: the same
    // condition as a server render, where track must be a silent no-op.
    expect(track("view_pricing")).toBe(false);
  });
});
