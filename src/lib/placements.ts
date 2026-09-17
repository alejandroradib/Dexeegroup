/** Monthly margin for a placement: what the client pays minus what the professional costs, per month. */
export function monthlyMargin(input: { monthly_bill_rate_usd: number; monthly_salary_usd: number }): number {
  return Math.round(input.monthly_bill_rate_usd - input.monthly_salary_usd);
}

export function marginPercent(input: { monthly_bill_rate_usd: number; monthly_salary_usd: number }): number | null {
  if (input.monthly_bill_rate_usd <= 0) return null;
  return Math.round((monthlyMargin(input) / input.monthly_bill_rate_usd) * 1000) / 10;
}

export function totalMonthlyMargin(rows: { monthly_bill_rate_usd: number; monthly_salary_usd: number; status: "active" | "ended" }[]): number {
  return rows.filter((r) => r.status === "active").reduce((sum, r) => sum + monthlyMargin(r), 0);
}
