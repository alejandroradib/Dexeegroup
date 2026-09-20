import { describe, expect, it } from "vitest";

import {
  CLAIMS,
  EVIDENCE,
  TESTIMONIALS,
  claimById,
  consentedTestimonials,
  verifiedClaims,
} from "@/content/proof";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Guards PHASES-GTM 9.0: an unsourced number, an anonymous testimonial or an
 * unattributed statistic must fail the build, not reach a public page.
 *
 * These assertions run over the raw arrays, not over the filtered output. Asserting on
 * `verifiedClaims()` would pass vacuously, because the filter is exactly what hides a bad
 * entry — the test has to see the authoring surface for it to catch anything.
 */
describe("public claims", () => {
  it("a claim marked verified carries a source and a measurement date", () => {
    for (const claim of CLAIMS) {
      if (!claim.verified) continue;
      expect(claim.source.trim(), `claim "${claim.id}" is verified but has no source`).not.toBe("");
      expect(claim.asOf, `claim "${claim.id}" is verified but has no asOf date`).toMatch(ISO_DATE);
      expect(claim.value.trim(), `claim "${claim.id}" has no value`).not.toBe("");
      expect(claim.label.trim(), `claim "${claim.id}" has no label`).not.toBe("");
    }
  });

  it("uses stable unique ids", () => {
    const ids = CLAIMS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("verifiedClaims never returns an entry without a source or a date", () => {
    for (const claim of verifiedClaims()) {
      expect(claim.source.trim()).not.toBe("");
      expect(claim.asOf).toMatch(ISO_DATE);
    }
  });

  it("claimById only resolves verified claims", () => {
    expect(claimById("does-not-exist")).toBeUndefined();
    for (const claim of CLAIMS.filter((c) => !c.verified)) {
      expect(claimById(claim.id)).toBeUndefined();
    }
  });
});

describe("testimonials", () => {
  it("a testimonial with consent on file names a real person, role and company", () => {
    for (const item of TESTIMONIALS) {
      if (!item.consentOnFile) continue;
      expect(item.name.trim(), `testimonial "${item.id}" has no name`).not.toBe("");
      expect(item.company.trim(), `testimonial "${item.id}" has no company`).not.toBe("");
      expect(item.role.trim(), `testimonial "${item.id}" has no role`).not.toBe("");
      expect(item.quote.trim(), `testimonial "${item.id}" has no quote`).not.toBe("");
      expect(item.asOf, `testimonial "${item.id}" has no date`).toMatch(ISO_DATE);
    }
  });

  it("no testimonial renders without recorded consent", () => {
    for (const item of consentedTestimonials()) {
      expect(item.consentOnFile, `testimonial "${item.id}" renders without consent`).toBe(true);
    }
    const withoutConsent = TESTIMONIALS.filter((t) => !t.consentOnFile).map((t) => t.id);
    const rendered = consentedTestimonials().map((t) => t.id);
    for (const id of withoutConsent) expect(rendered).not.toContain(id);
  });

  it("uses stable unique ids", () => {
    const ids = TESTIMONIALS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("third-party evidence", () => {
  it("every statistic carries publisher, date and link", () => {
    expect(EVIDENCE.length).toBeGreaterThan(0);
    for (const item of EVIDENCE) {
      expect(item.publisher.trim(), `evidence "${item.id}" has no publisher`).not.toBe("");
      expect(item.date, `evidence "${item.id}" has no publication date`).toMatch(ISO_DATE);
      expect(item.url, `evidence "${item.id}" has no link`).toMatch(/^https:\/\//);
      expect(item.statement.trim(), `evidence "${item.id}" has no statement`).not.toBe("");
    }
  });

  it("uses stable unique ids", () => {
    const ids = EVIDENCE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
