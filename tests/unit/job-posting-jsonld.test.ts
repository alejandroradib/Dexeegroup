import { describe, expect, it } from "vitest";

import { buildJobPostingJsonLd } from "@/lib/seo/job-posting";
import type { PublicJob } from "@/server/services/public-jobs";

const base: PublicJob = {
  id: "e0000000-0000-4000-8000-000000000001",
  title: "Senior Accountant",
  slug: "senior-accountant-e00000",
  role_family: "finance_accounting",
  seniority: "senior",
  contract_type: "dexee_eor",
  employment_type: "full_time",
  work_mode: "remote",
  english_level_required: "C1",
  skills: ["US GAAP"],
  description: "Own the close.\n\nReport to the controller.",
  responsibilities: "- Close the books\n- Reconcile",
  requirements: "- 5 years",
  hours_per_week: 40,
  timezone_overlap: "full_et",
  start_date: null,
  salary_min_usd: 2800,
  salary_max_usd: 3600,
  show_salary: true,
  confidential_company: false,
  company_name: "Harbor Health Admin",
  company_logo_path: null,
  company_sector: "healthcare",
  company_size: "s201_1000",
  published_at: "2026-09-01T00:00:00.000Z",
  closes_at: null,
};

describe("buildJobPostingJsonLd", () => {
  it("produces the required JobPosting properties", () => {
    const ld = buildJobPostingJsonLd(base, { siteUrl: "https://dexeegroup.com", locale: "en" });
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.title).toBe("Senior Accountant");
    expect(ld.datePosted).toBe(base.published_at);
    expect(ld.validThrough).toBeDefined();
    expect(ld.employmentType).toEqual(["FULL_TIME"]);
    expect(ld.hiringOrganization).toEqual({ "@type": "Organization", name: "Harbor Health Admin" });
    expect(ld.jobLocationType).toBe("TELECOMMUTE");
    expect(ld.applicantLocationRequirements).toEqual({ "@type": "Country", name: "Colombia" });
    expect(ld.identifier.value).toBe(base.id);
    expect(ld.baseSalary?.value).toEqual({
      "@type": "QuantitativeValue",
      minValue: 2800,
      maxValue: 3600,
      unitText: "MONTH",
    });
    expect(ld.description).toContain("<ul><li>Close the books</li><li>Reconcile</li></ul>");
    expect(ld.url).toBe("https://dexeegroup.com/en/jobs/senior-accountant-e00000");
  });

  it("uses Dexee as hiring organization for confidential jobs and omits salary when hidden", () => {
    const ld = buildJobPostingJsonLd(
      {
        ...base,
        confidential_company: true,
        company_name: "Confidential",
        show_salary: false,
        salary_min_usd: null,
        salary_max_usd: null,
      },
      { siteUrl: "https://dexeegroup.com", locale: "es" },
    );
    expect(ld.hiringOrganization.name).toBe("Dexee");
    expect(ld.baseSalary).toBeUndefined();
  });

  it("marks contractors and part-time roles", () => {
    const ld = buildJobPostingJsonLd(
      { ...base, employment_type: "part_time", contract_type: "independent_contractor" },
      { siteUrl: "https://dexeegroup.com", locale: "en" },
    );
    expect(ld.employmentType).toEqual(["PART_TIME", "CONTRACTOR"]);
  });

  it("escapes HTML in descriptions", () => {
    const ld = buildJobPostingJsonLd(
      { ...base, description: "<script>alert(1)</script>" },
      { siteUrl: "https://dexeegroup.com", locale: "en" },
    );
    expect(ld.description).not.toContain("<script>");
    expect(ld.description).toContain("&lt;script&gt;");
  });
});

/**
 * PHASES-GTM 9.5: the structure check Google's Rich Results Test runs. Asserted here over
 * the shapes the seed produces, so a missing field fails the build rather than the test
 * tool weeks later.
 */
function expectValidStructure(ld: ReturnType<typeof buildJobPostingJsonLd>) {
  expect(ld["@context"]).toBe("https://schema.org");
  expect(ld["@type"]).toBe("JobPosting");
  expect(ld.title.trim()).not.toBe("");
  expect(ld.description.trim()).not.toBe("");
  expect(Date.parse(ld.datePosted)).not.toBeNaN();
  expect(Date.parse(ld.validThrough ?? "")).not.toBeNaN();
  // Google rejects a posting whose validThrough is not after datePosted.
  expect(Date.parse(ld.validThrough ?? "")).toBeGreaterThan(Date.parse(ld.datePosted));
  expect(ld.employmentType.length).toBeGreaterThan(0);
  expect(ld.hiringOrganization.name.trim()).not.toBe("");
  expect(ld.jobLocationType).toBe("TELECOMMUTE");
  expect(ld.applicantLocationRequirements.name).toBe("Colombia");
  expect(ld.identifier.value.trim()).not.toBe("");
  expect(ld.url).toMatch(/^https:\/\/[^/]+\/(en|es)\/jobs\/.+/);
  if (ld.baseSalary) {
    expect(ld.baseSalary.currency).toBe("USD");
    expect(ld.baseSalary.value.unitText).toBe("MONTH");
    const { minValue, maxValue } = ld.baseSalary.value;
    expect(minValue ?? maxValue).toBeDefined();
    if (minValue !== undefined && maxValue !== undefined) {
      expect(maxValue).toBeGreaterThanOrEqual(minValue);
    }
  }
}

describe("Rich Results structure check", () => {
  const jobs: { label: string; job: PublicJob; locale: string }[] = [
    { label: "salary shown, named company", job: base, locale: "en" },
    {
      label: "confidential company with the salary hidden",
      job: {
        ...base,
        confidential_company: true,
        company_name: "Confidential",
        show_salary: false,
        salary_min_usd: null,
        salary_max_usd: null,
      },
      locale: "es",
    },
    {
      label: "part-time contractor with a close date",
      job: {
        ...base,
        employment_type: "part_time",
        contract_type: "independent_contractor",
        closes_at: "2026-12-31T00:00:00.000Z",
      },
      locale: "en",
    },
  ];

  for (const { label, job, locale } of jobs) {
    it(`passes for a job with ${label}`, () => {
      expectValidStructure(
        buildJobPostingJsonLd(job, { siteUrl: "https://dexeegroup.com", locale }),
      );
    });
  }

  it("omits baseSalary when show_salary is on but no bound is set", () => {
    const ld = buildJobPostingJsonLd(
      { ...base, show_salary: true, salary_min_usd: null, salary_max_usd: null },
      { siteUrl: "https://dexeegroup.com", locale: "en" },
    );
    // An empty MonetaryAmount invalidates the whole posting, so it must be left out.
    expect(ld.baseSalary).toBeUndefined();
    expectValidStructure(ld);
  });

  it("still validates when the company never set a description", () => {
    const ld = buildJobPostingJsonLd(
      { ...base, description: null, responsibilities: null, requirements: null },
      { siteUrl: "https://dexeegroup.com", locale: "en" },
    );
    expectValidStructure(ld);
  });
});
