import { describe, expect, it } from "vitest";

import { CALCULATOR_DEFAULTS, PRICING } from "@/content/pricing";
import { compareHireCost, type CostInput } from "@/lib/pricing/calculator";
import { formatUsd } from "@/lib/utils";

const BASE: CostInput = {
  usMonthlySalaryUsd: 7500,
  dexeeMonthlySalaryUsd: 3200,
  usEmployerLoadPct: 30,
  usRecruitingFeePct: 20,
  dexeeEmployerLoadPct: 35,
  months: 12,
  mode: "placement",
  placementFeeUsd: 3500,
  eorMonthlyFeeUsd: 599,
};

/** PHASES-GTM 9.1 requires the arithmetic checked at three seniority levels. */
describe("cost comparison, by seniority", () => {
  it("junior role, placement", () => {
    const result = compareHireCost({
      ...BASE,
      usMonthlySalaryUsd: 4500,
      dexeeMonthlySalaryUsd: 1800,
    });
    expect(result.us).toEqual({
      salary: 54_000,
      employerLoad: 16_200,
      oneTime: 10_800,
      management: 0,
      total: 81_000,
    });
    expect(result.dexee).toEqual({
      salary: 21_600,
      employerLoad: 7_560,
      oneTime: 3_500,
      management: 0,
      total: 32_660,
    });
    expect(result.savings).toBe(48_340);
    expect(result.savingsPct).toBe(60);
  });

  it("mid-level role, EOR", () => {
    const result = compareHireCost({ ...BASE, mode: "eor" });
    expect(result.us.total).toBe(135_000);
    expect(result.dexee).toEqual({
      salary: 38_400,
      employerLoad: 13_440,
      oneTime: 0,
      management: 7_188,
      total: 59_028,
    });
    expect(result.savings).toBe(75_972);
    expect(result.savingsPct).toBe(56);
  });

  it("senior role over a six-month horizon, placement", () => {
    const result = compareHireCost({
      ...BASE,
      usMonthlySalaryUsd: 12_000,
      dexeeMonthlySalaryUsd: 5_500,
      months: 6,
    });
    // The agency fee is one-time on the first-year salary, so a shorter horizon does not
    // shrink it; salary and employer load do.
    expect(result.us).toEqual({
      salary: 72_000,
      employerLoad: 21_600,
      oneTime: 28_800,
      management: 0,
      total: 122_400,
    });
    expect(result.dexee.total).toBe(48_050);
    expect(result.savingsPct).toBe(61);
  });
});

describe("cost comparison, edges", () => {
  it("never charges a placement fee and a management fee for the same hire", () => {
    const placement = compareHireCost(BASE);
    expect(placement.dexee.oneTime).toBe(3_500);
    expect(placement.dexee.management).toBe(0);
    const eor = compareHireCost({ ...BASE, mode: "eor" });
    expect(eor.dexee.oneTime).toBe(0);
  });

  it("treats a cleared or negative input as zero instead of producing NaN", () => {
    const result = compareHireCost({
      ...BASE,
      usMonthlySalaryUsd: Number.NaN,
      dexeeMonthlySalaryUsd: -500,
      usEmployerLoadPct: Number.NaN,
    });
    expect(result.us.total).toBe(0);
    expect(result.dexee.salary).toBe(0);
    expect(Number.isNaN(result.savings)).toBe(false);
    expect(result.savingsPct).toBe(0);
  });

  it("floors the horizon at one month", () => {
    expect(compareHireCost({ ...BASE, months: 0 }).months).toBe(1);
    expect(compareHireCost({ ...BASE, months: -4 }).months).toBe(1);
    expect(compareHireCost({ ...BASE, months: 7.8 }).months).toBe(7);
  });

  it("reports a loss rather than hiding it when Dexee costs more", () => {
    const result = compareHireCost({
      ...BASE,
      usMonthlySalaryUsd: 1_000,
      dexeeMonthlySalaryUsd: 5_000,
    });
    expect(result.savings).toBeLessThan(0);
    expect(result.savingsPct).toBeLessThan(0);
  });
});

describe("calculator defaults", () => {
  it("match the published prices they stand in for", () => {
    const placement = PRICING.find((p) => p.id === "placement");
    const eor = PRICING.find((p) => p.id === "eor");
    expect(placement?.amountUsd).toBe(3500);
    expect(eor?.amountUsd).toBe(599);
    expect(CALCULATOR_DEFAULTS.months).toBe(12);
  });

  it("every default is a positive number a visitor can reason about", () => {
    for (const [key, value] of Object.entries(CALCULATOR_DEFAULTS)) {
      expect(typeof value, key).toBe("number");
      expect(value, key).toBeGreaterThan(0);
    }
  });
});

describe("currency formatting", () => {
  it("renders whole dollars in both locales", () => {
    expect(formatUsd(3500, "en")).toContain("3,500");
    expect(formatUsd(3500, "en")).not.toContain(".00");
    expect(formatUsd(3500, "es")).toMatch(/3[.,\s ]?500/);
  });
});
