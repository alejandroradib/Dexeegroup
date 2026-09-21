import { getTranslations } from "next-intl/server";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/i18n/navigation";
import { buildFaqPageJsonLd } from "@/lib/seo/faq-page";
import { serializeJsonLd } from "@/lib/seo/json-ld";

/**
 * The buyer FAQ (PHASES-GTM 9.3). Each answer that has a page behind it links to it, so a
 * reader can check the claim rather than take it on trust.
 *
 * The JSON-LD is built from the same strings the accordion renders: Google drops FAQ rich
 * results when the markup and the visible page disagree.
 */
const FAQS = [
  { id: "timeline", href: "/how-we-verify" },
  { id: "contactDetails", href: "/sample-report" },
  { id: "classification", href: "/pricing" },
  { id: "guarantee", href: "/guarantee" },
  { id: "english", href: "/how-we-verify" },
  { id: "ip", href: null },
  { id: "timezone", href: null },
  { id: "dataProtection", href: "/privacy" },
  { id: "security", href: null },
  { id: "payment", href: "/pricing" },
  { id: "candidateCost", href: "/for-talent" },
] as const;

export async function BuyerFaq() {
  const t = await getTranslations("marketing.companies");
  const items = FAQS.map((faq) => ({
    ...faq,
    question: t(`faq.${faq.id}.q` as "faq.timeline.q"),
    answer: t(`faq.${faq.id}.a` as "faq.timeline.a"),
  }));
  const jsonLd = buildFaqPageJsonLd(items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Accordion type="single" collapsible>
        {items.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p>{item.answer}</p>
              {item.href ? (
                <p className="mt-3">
                  <Link className="text-link text-sm underline" href={item.href}>
                    {t("faqMoreLabel")}
                  </Link>
                </p>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
