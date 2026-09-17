import { describe, expect, it } from "vitest";

import { marginPercent, monthlyMargin, totalMonthlyMargin } from "@/lib/placements";

describe("placements margin", () => {
  it("computes monthly margin as bill rate minus salary", () => {
    expect(monthlyMargin({ monthly_bill_rate_usd: 4800, monthly_salary_usd: 3200 })).toBe(1600);
  });
  it("computes margin percent with one decimal", () => {
    expect(marginPercent({ monthly_bill_rate_usd: 4800, monthly_salary_usd: 3200 })).toBe(33.3);
    expect(marginPercent({ monthly_bill_rate_usd: 0, monthly_salary_usd: 100 })).toBeNull();
  });
  it("totals only active placements", () => {
    expect(
      totalMonthlyMargin([
        { monthly_bill_rate_usd: 4800, monthly_salary_usd: 3200, status: "active" },
        { monthly_bill_rate_usd: 3000, monthly_salary_usd: 2000, status: "active" },
        { monthly_bill_rate_usd: 9000, monthly_salary_usd: 1000, status: "ended" },
      ]),
    ).toBe(2600);
  });
  it("handles negative margin", () => {
    expect(monthlyMargin({ monthly_bill_rate_usd: 2000, monthly_salary_usd: 2500 })).toBe(-500);
  });
});
