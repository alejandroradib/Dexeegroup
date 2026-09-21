import { describe, expect, it } from "vitest";

import en from "@/../messages/en.json";
import es from "@/../messages/es.json";

import { VERIFIED_LEVEL_RESTS_ON, productById } from "@/content/pricing";
import {
  CLAIMS,
  EVIDENCE,
  TESTIMONIALS,
  claimById,
  consentedTestimonials,
  verifiedClaims,
} from "@/content/proof";
import { SAMPLE_CHECKS } from "@/content/sample-report";

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

describe("evidence is published in both languages", () => {
  it("every cited statistic has a message in English and in Spanish", () => {
    for (const item of EVIDENCE) {
      const english =
        en.marketing.verify.evidence[item.id as keyof typeof en.marketing.verify.evidence];
      const spanish =
        es.marketing.verify.evidence[item.id as keyof typeof es.marketing.verify.evidence];
      expect(english, `evidence "${item.id}" has no English message`).toBeTruthy();
      expect(spanish, `evidence "${item.id}" has no Spanish message`).toBeTruthy();
    }
  });

  it("the English message is the verbatim record in proof.ts, so the two cannot drift", () => {
    for (const item of EVIDENCE) {
      const english =
        en.marketing.verify.evidence[item.id as keyof typeof en.marketing.verify.evidence];
      expect(english, `evidence "${item.id}" was reworded in messages/en.json`).toBe(
        item.statement,
      );
    }
  });

  it("the Spanish message is a translation, not the English text copied over", () => {
    for (const item of EVIDENCE) {
      const spanish =
        es.marketing.verify.evidence[item.id as keyof typeof es.marketing.verify.evidence];
      expect(spanish, `evidence "${item.id}" is not translated`).not.toBe(item.statement);
    }
  });
});

/**
 * Guards PHASES-GTM 9.0 on the message files, not just on `proof.ts`.
 *
 * A claim can enter the site through a translation string without ever touching the
 * `CLAIMS` array, which is how "New roles are published every week" shipped on an empty
 * job board. A publication-cadence promise is a measurable claim about Dexee: it belongs
 * in `CLAIMS` with a source and a date, or it does not belong on a public page.
 *
 * The pattern is deliberately narrow — it targets how often something is published or
 * posted, not every use of "month" (salaries are quoted per month everywhere).
 */
const CADENCE_CLAIM =
  /(published|posted|publicamos|publicadas?|nuevas vacantes|new (roles|jobs))[^.]{0,40}\b(every (week|day|month)|each (week|day|month)|weekly|daily|cada (semana|d[ií]a|mes)|semanal(mente)?|a diario)\b/i;

function publicStrings(node: unknown, path: string, out: [string, string][]) {
  if (typeof node === "string") out.push([path, node]);
  else if (node && typeof node === "object")
    for (const [key, value] of Object.entries(node)) publicStrings(value, `${path}.${key}`, out);
}

describe("no unverified cadence claims in public copy", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["es", es],
  ] as const) {
    it(`${locale} marketing copy promises no publication frequency`, () => {
      const found: string[] = [];
      const strings: [string, string][] = [];
      publicStrings(messages.marketing, "marketing", strings);
      for (const [path, value] of strings) if (CADENCE_CLAIM.test(value)) found.push(`${path}: ${value}`);
      expect(
        found,
        `these strings promise how often Dexee publishes; record the number in CLAIMS with a source or remove the promise:\n${found.join("\n")}`,
      ).toEqual([]);
    });
  }
});

/**
 * Guards DECISIONS 89: the level Dexee Verified certifies is the reviewer-graded spoken
 * assessment. An unsupervised written test is a screen that can only lower that level, and
 * the public copy has to say so wherever it describes the written part, in both locales.
 *
 * The check is on the authoring surfaces a buyer reads first: the product line on
 * `/pricing`, the written check on `/how-we-verify` and the order of the sample report.
 */
const LOWER_ONLY = /\b(lower|floor|bajar|menor|piso)\b/i;
const REVIEWER = /\b(reviewer|revisor)\b/i;
const SPOKEN = /\b(spoken|oral|hablad[oa])\b/i;

describe("Dexee Verified rests on the spoken assessment", () => {
  const verified = productById("verified");

  it("lists the certifying check first and the written screen after it", () => {
    expect(verified).toBeDefined();
    const includes = verified?.includes ?? [];
    expect(includes[0]).toBe(VERIFIED_LEVEL_RESTS_ON.certifies);
    expect(includes.indexOf(VERIFIED_LEVEL_RESTS_ON.floorCheck)).toBeGreaterThan(0);
  });

  it("the sample report shows the certifying check before the written screen", () => {
    const ids = SAMPLE_CHECKS.map((c) => c.id);
    expect(ids.indexOf(VERIFIED_LEVEL_RESTS_ON.certifies)).toBeLessThan(
      ids.indexOf(VERIFIED_LEVEL_RESTS_ON.floorCheck),
    );
  });

  for (const [locale, messages] of [
    ["en", en],
    ["es", es],
  ] as const) {
    const pricing = messages.marketing.pricing.products.verified;
    const written = messages.marketing.verify.checks.writtenEnglish;

    it(`${locale}: the product summary names the spoken assessment and the reviewer`, () => {
      expect(pricing.summary).toMatch(SPOKEN);
      expect(pricing.summary).toMatch(REVIEWER);
      expect(pricing.includes.spokenEnglish).toMatch(REVIEWER);
    });

    it(`${locale}: every description of the written part says it can only lower the level`, () => {
      expect(pricing.includes.writtenEnglish).toMatch(LOWER_ONLY);
      expect(written.body).toMatch(LOWER_ONLY);
      expect(written.decidedBy).not.toMatch(/\b(final|definitiv[oa])\b/i);
    });

    it(`${locale}: the FAQ answer states the lower-of-two rule`, () => {
      expect(messages.marketing.companies.faq.english.a).toMatch(LOWER_ONLY);
      expect(messages.marketing.companies.faq.english.a).toMatch(REVIEWER);
    });
  }
});
