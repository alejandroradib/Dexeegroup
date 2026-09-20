# Public claims register

Every number, testimonial and third-party statistic shown on a public page is registered
here with its source, the date it was measured and who verified it. The machine-readable
version is `src/content/proof.ts`; this file is the human record and the two must agree.

`tests/unit/proof.test.ts` enforces the rules: a claim marked `verified` without a source
or a date fails the test run, and a testimonial with consent recorded but no real name,
role or company fails too. Both were confirmed by temporarily adding a bad entry.

**Rule: when a figure changes, update `src/content/proof.ts` and this file in the same commit.**

## Dexee metrics

None published. `CLAIMS` in `src/content/proof.ts` is deliberately empty.

Three figures were removed on 2026-09-20 because nothing supported them. They came from
the brand kit as design placeholders and the code that held them
(`src/lib/site.ts`, `SITE_METRICS`) carried the comment "Replace with verified figures
before launch". They were rendered on the home page under the heading "In figures", above
a line that read "Figures updated every quarter", which presented them as measured.

| Removed figure | Label shown                   | Why it was removed                                      |
| -------------- | ----------------------------- | ------------------------------------------------------- |
| 1,200          | professionals in the database | No measurement. The seeded database held 8 candidates.  |
| 12             | average days to shortlist     | Dexee has not yet run a shortlist through the platform. |
| 94%            | client retention              | No client history to compute retention from.            |

### What replaced them

The home page now shows the **founding client program**: ten seats, priority sourcing, the
published price locked for twelve months, and an extended replacement guarantee. These are
commitments Dexee controls and can put in a contract, not measurements. Alongside it, a
process transparency block states how Dexee works. Both are true on the day they ship.

### When to publish real metrics

Add an entry to `CLAIMS` only when all four hold:

1. The figure comes from the platform database or a document, not an estimate.
2. You can name the query, report or system it came from, in `source`.
3. You record the date it was measured, in `asOf`.
4. A second person has checked it. Record who, in the table below.

Candidate metrics once there is data: candidates with a verified English level, median days
from job publication to first shortlist, replacement guarantee claims honoured, client
retention over twelve months.

## Testimonials

None published. `TESTIMONIALS` in `src/content/proof.ts` is empty.

Two quotes were removed on 2026-09-20. Both were written as part of the initial build to
illustrate the layout, attributed to unnamed people ("COO, healthcare administration
company, Florida" and "Founder, property-tech startup, Colorado"). They described events
that did not happen.

A testimonial may be published only with the client's written consent on file, naming the
person, their role and their company. Set `consentOnFile: true` and record where the
consent is stored in the table below.

## Third-party evidence

Cited on `/how-we-verify` and in the verification section of `/for-companies`. These are
other organizations' published research, attributed with publisher, date and link.

| id                             | Publisher                   | Date       | Used for                                               |
| ------------------------------ | --------------------------- | ---------- | ------------------------------------------------------ |
| `checkr-impersonation-2025`    | Checkr                      | 2025-09-01 | Interview impersonation prevalence and reported losses |
| `gartner-fake-candidates-2028` | Gartner                     | 2025-04-03 | Projected share of fake candidate profiles by 2028     |
| `ftc-job-scam-losses`          | US Federal Trade Commission | 2025-03-10 | Growth in reported job-scam losses, 2020 to 2024       |

Each is reproduced verbatim in `EVIDENCE` with its statement, and rendered with the
publisher and date visible to the reader. Re-check the links before the domain switch, as
publishers move URLs.

## Prices

Published in `src/content/pricing.ts`, marked `provisional: true`. These are anchored to
public competitor pricing, not to Dexee's costs, and Alejandro has not yet set the final
numbers. They are honest as published prices because Dexee will honour them, but they are
not yet a considered margin decision.

| Product                  | Provisional figure                                  | Market anchor                                                |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| Placement                | USD 3,500 (USD 500 deposit, USD 3,000 on placement) | HireLATAM publishes this structure with a 90-day guarantee   |
| Dexee EOR management     | USD 599 per person per month                        | Deel and Remote USD 599, Oyster USD 699, Pebl USD 399        |
| Managed staffing, all in | from USD 4,500 per month                            | LATAM band USD 4,500 to 13,000 by seniority                  |
| Dexee Verified report    | USD 149 per candidate, free with a placement        | Background checks USD 30 to 150; English tests USD 70 to 325 |

## Verification log

| Date       | Claim                      | Action                                | By                |
| ---------- | -------------------------- | ------------------------------------- | ----------------- |
| 2026-09-20 | Three home-page metrics    | Removed, unsupported                  | Claude, Phase 9.0 |
| 2026-09-20 | Two anonymous testimonials | Removed, fabricated                   | Claude, Phase 9.0 |
| 2026-09-20 | Three fraud statistics     | Added with publisher, date and link   | Claude, Phase 9.0 |
| 2026-09-20 | Four prices                | Added as provisional, market-anchored | Claude, Phase 9.1 |

---

## Checklist before pointing dexeegroup.com at the deployment

Do not switch the domain until each line is resolved. Each one is currently either empty
or provisional, and the site is honest today only because nothing unverified renders.

- [ ] **Metrics.** Either publish real figures with source and date in `CLAIMS`, or leave
      it empty. Leaving it empty is a valid answer and better than a guess.
- [ ] **Testimonials.** Obtain written consent from at least one named client. Without
      consent recorded, do not publish.
- [ ] **Prices.** Alejandro sets the four final numbers. Remove `provisional: true` and
      update the table above with the reasoning behind each.
- [ ] **Guarantee terms.** The replacement window, exclusions and remedy on `/guarantee`
      are drafted by Claude. Dexee's counsel reviews them before a buyer can rely on them.
- [ ] **Privacy policy and terms.** Same: drafted for review, not reviewed. They carry a
      notice saying so; that notice comes off only after counsel signs off.
- [ ] **Calendly.** `CALENDLY_URL` is unset, so the "book a call" buttons do not render.
      Set a real booking link or leave the buttons off.
- [ ] **Evidence links.** Re-check the three third-party URLs resolve.
