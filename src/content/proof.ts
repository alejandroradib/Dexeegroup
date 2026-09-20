/**
 * Single source of truth for every public claim (PHASES-GTM 9.0).
 *
 * Nothing here reaches a public page unless it is verifiable:
 * a claim needs `source` and `asOf` and `verified === true`; a testimonial needs a real
 * name, a real company and `consentOnFile === true`; an evidence item needs publisher,
 * date and url. `tests/unit/proof.test.ts` enforces all three rules, so an unsourced
 * number fails the build rather than shipping.
 *
 * When a figure changes, update `docs/CLAIMS.md` in the same commit.
 */

/** A number shown on a public page. `value` is pre-formatted for display. */
export type Claim = {
  id: string;
  value: string;
  label: string;
  /** Where the number comes from. Must name a system, document or measurement. */
  source: string;
  /** ISO date the figure was measured. */
  asOf: string;
  verified: boolean;
};

/** A client quote. Anonymous quotes are not publishable. */
export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  logo?: string;
  /** Written consent recorded. Without it the quote never renders. */
  consentOnFile: boolean;
  asOf: string;
};

/** Third-party research cited on the verification pages. Always attributed. */
export type Evidence = {
  id: string;
  statement: string;
  publisher: string;
  /** ISO date of publication. */
  date: string;
  url: string;
};

/**
 * Dexee's own metrics. Empty on purpose: the previous figures (1,200 candidates,
 * 12 days to shortlist, 94% retention) were placeholders from the brand kit with no
 * measurement behind them, so they were removed rather than shipped as fact.
 * Add entries here once the platform has produced them, with source and date.
 */
export const CLAIMS: readonly Claim[] = [];

/** Client quotes. Empty until Dexee has written consent from a named client. */
export const TESTIMONIALS: readonly Testimonial[] = [];

/** Market research on interview fraud, used on /how-we-verify and /for-companies. */
export const EVIDENCE: readonly Evidence[] = [
  {
    id: "checkr-impersonation-2025",
    statement:
      "35% of 3,000 US hiring managers said someone other than the listed applicant took part in a virtual interview, and 23% reported losses above USD 50,000 in the past year from hiring or identity fraud.",
    publisher: "Checkr",
    date: "2025-09-01",
    url: "https://checkr.com/resources/articles/hiring-fraud-report",
  },
  {
    id: "gartner-fake-candidates-2028",
    statement:
      "Gartner projects that by 2028 one in four candidate profiles worldwide will be fake.",
    publisher: "Gartner",
    date: "2025-04-03",
    url: "https://www.gartner.com/en/newsroom/press-releases/2025-04-03-gartner-predicts-by-2028-one-in-four-candidate-profiles-will-be-fake",
  },
  {
    id: "ftc-job-scam-losses",
    statement:
      "Reported losses from job and employment-agency scams in the United States rose from USD 90 million in 2020 to USD 501 million in 2024.",
    publisher: "US Federal Trade Commission",
    date: "2025-03-10",
    url: "https://www.ftc.gov/news-events/data-visualizations/data-spotlight",
  },
] as const;

/**
 * What the first ten clients get. This is a commitment Dexee controls, not a measurement,
 * so it is honest proof for an early-stage company with no track record to publish yet.
 * The copy lives in `messages/*.json` under `marketing.home.founding*`; these are the ids.
 */
export const FOUNDING_CLIENT_PROGRAM = {
  seats: 10,
  benefitIds: ["prioritySourcing", "lockedPrice", "extendedGuarantee"],
  /** Months the published price stays fixed for a founding client. */
  priceLockMonths: 12,
} as const;

/** Claims safe to render. Filtering happens here, never with CSS on a hidden element. */
export function verifiedClaims(): readonly Claim[] {
  return CLAIMS.filter((c) => c.verified && c.source.trim() !== "" && c.asOf.trim() !== "");
}

/** Testimonials safe to render: consent on file and a real person at a real company. */
export function consentedTestimonials(): readonly Testimonial[] {
  return TESTIMONIALS.filter(
    (t) => t.consentOnFile && t.name.trim() !== "" && t.company.trim() !== "",
  );
}

/** Look up one claim by id, only if it passes verification. */
export function claimById(id: string): Claim | undefined {
  return verifiedClaims().find((c) => c.id === id);
}
