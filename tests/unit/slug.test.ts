import { describe, expect, it } from "vitest";

import { jobSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, strips accents and collapses separators", () => {
    expect(slugify("Contador Sénior (US GAAP) / NetSuite")).toBe(
      "contador-senior-us-gaap-netsuite",
    );
  });
  it("trims leading and trailing dashes", () => {
    expect(slugify("  --Data Analyst--  ")).toBe("data-analyst");
  });
  it("matches the SQL seed slug format", () => {
    expect(jobSlug("Senior Accountant (US GAAP)", "e0000000-0000-4000-8000-000000000001")).toBe(
      "senior-accountant-us-gaap-e00000",
    );
  });
});
