import { describe, expect, it } from "vitest";


import en from "@/../messages/en.json";
import es from "@/../messages/es.json";

import { buildFaqPageJsonLd } from "@/lib/seo/faq-page";
import { serializeJsonLd } from "@/lib/seo/json-ld";

const LOCALES = { en, es };

function faqEntries(locale: keyof typeof LOCALES) {
  return Object.values(LOCALES[locale].marketing.companies.faq) as {
    q: string;
    a: string;
  }[];
}

describe("FAQPage JSON-LD", () => {
  it("emits the schema.org shape Google expects", () => {
    const jsonLd = buildFaqPageJsonLd([{ question: "Q?", answer: "A." }]);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toEqual([
      { "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } },
    ]);
  });

  it("drops an item with an empty question or answer instead of emitting it blank", () => {
    const jsonLd = buildFaqPageJsonLd([
      { question: "", answer: "A." },
      { question: "Q?", answer: "   " },
      { question: "Kept?", answer: "Yes." },
    ]);
    expect(jsonLd.mainEntity).toHaveLength(1);
    expect(jsonLd.mainEntity[0]?.name).toBe("Kept?");
  });

  it("collapses whitespace so wrapped copy does not ship newlines", () => {
    const jsonLd = buildFaqPageJsonLd([{ question: " A\n  question? ", answer: "One\ttwo." }]);
    expect(jsonLd.mainEntity[0]?.name).toBe("A question?");
    expect(jsonLd.mainEntity[0]?.acceptedAnswer.text).toBe("One two.");
  });

  it("survives JSON.stringify without characters that would break the script tag", () => {
    const jsonLd = buildFaqPageJsonLd(
      faqEntries("en").map((f) => ({ question: f.q, answer: f.a })),
    );
    const serialized = JSON.stringify(jsonLd);
    expect(serialized).not.toContain("</script");
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

/** PHASES-GTM 9.3: nine questions minimum, each answerable in under 80 words. */
describe("buyer FAQ content", () => {
  for (const locale of ["en", "es"] as const) {
    it(`${locale} publishes at least nine questions`, () => {
      expect(faqEntries(locale).length).toBeGreaterThanOrEqual(9);
    });

    it(`${locale} keeps every answer under eighty words`, () => {
      for (const entry of faqEntries(locale)) {
        const words = entry.a.trim().split(/\s+/).length;
        expect(words, `answer "${entry.q}" runs to ${words} words`).toBeLessThan(80);
      }
    });

    it(`${locale} phrases every question as a question`, () => {
      for (const entry of faqEntries(locale)) {
        expect(entry.q.trim(), `"${entry.q}" is not phrased as a question`).toMatch(/\?$/);
      }
    });
  }

  it("asks the same questions in both languages", () => {
    const enKeys = Object.keys(en.marketing.companies.faq);
    const esKeys = Object.keys(es.marketing.companies.faq);
    expect(esKeys).toEqual(enKeys);
  });
});

describe("FAQ script sink", () => {
  it("serializes a question containing a closing script tag without breaking out", () => {
    const rendered = serializeJsonLd(
      buildFaqPageJsonLd([{ question: "</script><b>x</b>", answer: "a & b" }]),
    );
    expect(rendered).not.toContain("</script>");
    expect(rendered).not.toMatch(/[<>&]/);
  });
});
