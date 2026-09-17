import { describe, expect, it } from "vitest";

import { completenessChecklist, computeCompleteness, type CompletenessInput } from "@/lib/profile/completeness";

const full: CompletenessInput = {
  first_name: "Laura",
  last_name: "Gómez",
  headline: "Senior accountant",
  summary: "Eight years in accounting.",
  skills: ["US GAAP", "NetSuite", "Excel"],
  english_self_level: "C1",
  desired_salary_min_usd: 2900,
  availability: "two_weeks",
  experience_count: 2,
  education_count: 1,
  has_resume: true,
};

describe("computeCompleteness", () => {
  it("returns 100 for a complete profile", () => {
    expect(computeCompleteness(full)).toBe(100);
  });

  it("returns 0 for an empty profile", () => {
    expect(
      computeCompleteness({
        first_name: null, last_name: null, headline: null, summary: null, skills: [], english_self_level: null,
        desired_salary_min_usd: null, availability: null, experience_count: 0, education_count: 0, has_resume: false,
      }),
    ).toBe(0);
  });

  it("matches the SQL weights for the seeded sparse candidate (Mariana)", () => {
    // identity 15 + summary 10 + education 10 + english 10 + compensation 10 = 55 (no experience, 2 skills, no resume)
    expect(computeCompleteness({ ...full, skills: ["Accounts payable", "Excel"], experience_count: 0, has_resume: false })).toBe(55);
  });

  it("requires headline for the identity block", () => {
    expect(computeCompleteness({ ...full, headline: "" })).toBe(85);
  });

  it("requires both salary and availability for the compensation block", () => {
    expect(computeCompleteness({ ...full, availability: null })).toBe(90);
  });

  it("weights sum to 100", () => {
    expect(completenessChecklist(full).reduce((s, i) => s + i.weight, 0)).toBe(100);
  });
});
