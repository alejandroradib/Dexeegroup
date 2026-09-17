/** Editable constants for the marketing site (SPEC 10.1). */
export const SITE = {
  name: "Dexee",
  legalName: "Dexee S.A.S.",
  nit: "901.990.687",
  city: "Barranquilla, Colombia",
  email: "info@dexeegroup.com",
  domain: "dexeegroup.com",
  linkedin: "https://www.linkedin.com/company/dexeegroup",
} as const;

/** Placeholder benchmarks flagged in the brand kit. Replace with verified figures before launch. */
export const SITE_METRICS = {
  candidatesInDatabase: 1200,
  averageDaysToShortlist: 12,
  clientRetentionPercent: 94,
} as const;

export const TESTIMONIALS = [
  {
    quote:
      "We had an accountant working US hours in three weeks. The replacement guarantee made the decision easy.",
    author: "COO, healthcare administration company, Florida",
  },
  {
    quote:
      "Dexee handled payroll and compliance in Colombia so we could focus on onboarding. Our team never noticed the border.",
    author: "Founder, property-tech startup, Colorado",
  },
] as const;
