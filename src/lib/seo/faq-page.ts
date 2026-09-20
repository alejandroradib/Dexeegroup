/**
 * schema.org `FAQPage` for the buyer FAQ (PHASES-GTM 9.3).
 *
 * Google only shows FAQ rich results when the same questions and answers are visible on
 * the page, so the builder takes the strings the accordion renders. Answers are plain
 * text: markup in `acceptedAnswer.text` is a common reason the Rich Results Test rejects
 * the block, and the UI adds its "read more" link outside the answer string.
 */

export type FaqItem = { question: string; answer: string };

export type FaqPageJsonLd = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }[];
};

/** Collapses whitespace so a wrapped message does not ship newlines into the JSON-LD. */
function plain(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Builds the block. Items with an empty question or answer are dropped rather than
 * emitted blank, since an empty `Question` invalidates the whole block.
 */
export function buildFaqPageJsonLd(items: readonly FaqItem[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .map((item) => ({ question: plain(item.question), answer: plain(item.answer) }))
      .filter((item) => item.question !== "" && item.answer !== "")
      .map((item) => ({
        "@type": "Question" as const,
        name: item.question,
        acceptedAnswer: { "@type": "Answer" as const, text: item.answer },
      })),
  };
}
