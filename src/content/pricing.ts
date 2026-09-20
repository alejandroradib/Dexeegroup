/**
 * Published prices and guarantee terms (PHASES-GTM 9.1).
 *
 * Every figure a visitor sees lives here, never inline in a component. The copy that
 * surrounds them lives in `messages/*.json` under `marketing.pricing` and
 * `marketing.guarantee`; this file holds the numbers and the structure.
 *
 * All four prices are `provisional`: they are anchored to public competitor pricing, not
 * to Dexee's costs. Dexee will honour them as published, but they are not yet a considered
 * margin decision. `marketAnchor` records what each one was anchored to; the same table is
 * in `docs/CLAIMS.md`. Clear `provisional` only when Alejandro sets the final number.
 *
 * Salaries and fees are USD. Monthly figures are per month, per person.
 */

export type PriceUnit = "oneTime" | "perPersonMonth" | "perCandidate";

export type PricedProduct = {
  id: ProductId;
  amountUsd: number;
  unit: PriceUnit;
  /** Amount due at kickoff; the remainder falls due on placement. Placement only. */
  depositUsd?: number;
  /** The published figure is a floor, shown as "from USD x". */
  isFloor?: boolean;
  /** Message key suffixes under `marketing.pricing.products.<id>.includes.*`. */
  includes: readonly string[];
  provisional: boolean;
  /** Public pricing this figure was anchored to. Recorded, not rendered. */
  marketAnchor: string;
};

export type ProductId = "placement" | "eor" | "managedStaffing" | "verified";

export const PRICING: readonly PricedProduct[] = [
  {
    id: "placement",
    amountUsd: 3500,
    unit: "oneTime",
    depositUsd: 500,
    includes: ["sourcing", "verification", "shortlist", "guarantee", "noSalaryPercentage"],
    provisional: true,
    marketAnchor:
      "HireLATAM publishes USD 3,500 split USD 500 deposit and USD 3,000 on placement, with a 90-day replacement guarantee.",
  },
  {
    id: "eor",
    amountUsd: 599,
    unit: "perPersonMonth",
    includes: ["contract", "payroll", "compliance", "benefits", "support"],
    provisional: true,
    marketAnchor:
      "EOR platform fees: Deel and Remote USD 599, Oyster USD 699, Pebl USD 399 per employee per month.",
  },
  {
    id: "managedStaffing",
    amountUsd: 4500,
    unit: "perPersonMonth",
    isFloor: true,
    includes: ["allIn", "replacement", "management", "equipment", "singleInvoice"],
    provisional: true,
    marketAnchor:
      "All-in managed staffing in Latin America runs roughly USD 4,500 to 13,000 per person per month depending on seniority.",
  },
  {
    id: "verified",
    amountUsd: 149,
    unit: "perCandidate",
    includes: ["identity", "spokenEnglish", "writtenEnglish", "roleSkills", "report"],
    provisional: true,
    marketAnchor:
      "US background checks run USD 30 to 150; standardized English tests run USD 70 (Duolingo) to USD 195-325 (TOEFL, IELTS).",
  },
] as const;

/**
 * Replacement guarantee. Drafted for a buyer's counsel to read, and not yet reviewed by
 * Dexee's own counsel — `/guarantee` says so on the page until that review happens.
 */
export const GUARANTEE = {
  /** Calendar days from the start date during which a replacement is free. */
  replacementDays: 90,
  /** Founding clients get a longer window; see FOUNDING_CLIENT_PROGRAM in proof.ts. */
  foundingReplacementDays: 120,
  /** Calendar days the client has to open a claim after the person leaves. */
  claimWindowDays: 15,
  /** Business days Dexee takes to answer a claim in writing. */
  responseBusinessDays: 5,
  /** Business days to present the first replacement shortlist once a claim is accepted. */
  shortlistBusinessDays: 10,
  /** Message key suffixes under `marketing.guarantee.exclusions.*`. */
  exclusionIds: ["roleChanged", "noOnboarding", "redundancy", "unpaidInvoice", "directOffer"],
  /** Message key suffixes under `marketing.guarantee.steps.*`. */
  stepIds: ["notify", "review", "shortlist", "replace"],
} as const;

/**
 * Defaults for the cost comparison on `/pricing`. Every one is an assumption the visitor
 * can change on the page, not a Dexee measurement, and the page says so.
 */
export const CALCULATOR_DEFAULTS = {
  /** USD per month, gross, for the same role hired in the United States. */
  usMonthlySalaryUsd: 7500,
  /** USD per month, gross, for the same role hired in Colombia through Dexee. */
  dexeeMonthlySalaryUsd: 3200,
  /** Employer taxes and benefits on top of the US salary, as a percentage. */
  usEmployerLoadPct: 30,
  /** Agency fee on the first-year US salary, as a percentage. */
  usRecruitingFeePct: 20,
  /** Employer contributions on top of the Colombian salary, as a percentage. */
  dexeeEmployerLoadPct: 35,
  /** Horizon of the comparison, in months. */
  months: 12,
} as const;

export function productById(id: ProductId): PricedProduct | undefined {
  return PRICING.find((p) => p.id === id);
}

/** True while any published price is still provisional, so the page can say so once. */
export function hasProvisionalPricing(): boolean {
  return PRICING.some((p) => p.provisional);
}
