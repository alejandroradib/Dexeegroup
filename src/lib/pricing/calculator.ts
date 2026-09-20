/**
 * Cost comparison arithmetic for `/pricing` (PHASES-GTM 9.1).
 *
 * Pure functions: no I/O, no storage, no network. The component that uses this runs the
 * numbers in the browser and keeps nothing. Every input is an assumption the visitor
 * supplies; none of these figures are Dexee measurements.
 */

/** How the client engages Dexee. The two models never stack. */
export type EngagementMode = "placement" | "eor";

export type CostInput = {
  /** Gross USD per month for the role hired in the United States. */
  usMonthlySalaryUsd: number;
  /** Gross USD per month for the same role hired in Colombia through Dexee. */
  dexeeMonthlySalaryUsd: number;
  /** Employer taxes and benefits on the US salary, as a percentage. */
  usEmployerLoadPct: number;
  /** Agency fee on the first-year US salary, as a percentage. */
  usRecruitingFeePct: number;
  /** Employer contributions on the Colombian salary, as a percentage. */
  dexeeEmployerLoadPct: number;
  /** Horizon of the comparison, in months. */
  months: number;
  mode: EngagementMode;
  /** One-time placement fee. Charged in `placement` mode only. */
  placementFeeUsd: number;
  /** Monthly management fee per person. Charged in `eor` mode only. */
  eorMonthlyFeeUsd: number;
};

export type CostLine = {
  salary: number;
  employerLoad: number;
  /** One-time cost: the agency fee on the US side, the placement fee on the Dexee side. */
  oneTime: number;
  /** Recurring management fee. Zero on the US side and in `placement` mode. */
  management: number;
  total: number;
};

export type CostBreakdown = {
  months: number;
  us: CostLine;
  dexee: CostLine;
  /** Positive when Dexee costs less over the horizon. */
  savings: number;
  /** Savings as a percentage of the US total. Zero when the US total is zero. */
  savingsPct: number;
};

/** Rejects NaN and negatives so a cleared input never produces a nonsense total. */
function amount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function horizon(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function round(value: number): number {
  return Math.round(value);
}

/**
 * Total cost of one hire over the horizon, both ways.
 *
 * The US side is salary plus employer load over the horizon, plus a one-time agency fee
 * computed on the first-year salary. The Dexee side is the Colombian salary plus its
 * employer load over the same horizon, plus either the one-time placement fee or the
 * monthly management fee, never both.
 */
export function compareHireCost(input: CostInput): CostBreakdown {
  const months = horizon(input.months);

  const usMonthly = amount(input.usMonthlySalaryUsd);
  const usSalary = usMonthly * months;
  const usEmployerLoad = usSalary * (amount(input.usEmployerLoadPct) / 100);
  const usRecruiting = usMonthly * 12 * (amount(input.usRecruitingFeePct) / 100);

  const dexeeMonthly = amount(input.dexeeMonthlySalaryUsd);
  const dexeeSalary = dexeeMonthly * months;
  const dexeeEmployerLoad = dexeeSalary * (amount(input.dexeeEmployerLoadPct) / 100);
  const dexeePlacement = input.mode === "placement" ? amount(input.placementFeeUsd) : 0;
  const dexeeManagement = input.mode === "eor" ? amount(input.eorMonthlyFeeUsd) * months : 0;

  const us: CostLine = {
    salary: round(usSalary),
    employerLoad: round(usEmployerLoad),
    oneTime: round(usRecruiting),
    management: 0,
    total: round(usSalary + usEmployerLoad + usRecruiting),
  };

  const dexee: CostLine = {
    salary: round(dexeeSalary),
    employerLoad: round(dexeeEmployerLoad),
    oneTime: round(dexeePlacement),
    management: round(dexeeManagement),
    total: round(dexeeSalary + dexeeEmployerLoad + dexeePlacement + dexeeManagement),
  };

  const savings = us.total - dexee.total;

  return {
    months,
    us,
    dexee,
    savings,
    savingsPct: us.total === 0 ? 0 : round((savings / us.total) * 100),
  };
}
