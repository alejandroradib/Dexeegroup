import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { Section } from "@/components/domain/marketing/sections";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageLocale } from "@/i18n/server";
import { COMPARE_SLUGS, isCompareSlug, type CompareDocument } from "@/lib/content/compare";
import { readCompareDocument } from "@/lib/content/compare-source";
import { buildAlternates } from "@/lib/seo/alternates";
import { dateOnly } from "@/lib/utils";

import type { Metadata } from "next";

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }));
}

async function load(slug: string, locale: Locale): Promise<CompareDocument | null> {
  if (!isCompareSlug(slug)) return null;
  try {
    return await readCompareDocument(slug, locale);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/compare/[slug]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const doc = await load(slug, locale);
  if (!doc) return {};
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    alternates: buildAlternates(locale, `/compare/${slug}`),
    openGraph: {
      type: "article",
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
    },
  };
}

export default async function ComparePage({ params }: PageProps<"/[locale]/compare/[slug]">) {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const doc = await load(slug, locale);
  if (!doc) notFound();
  const t = await getTranslations("marketing.compare");
  const format = await getFormatter();

  return (
    <>
      <Section tone="navy" className="py-16">
        <div className="max-w-3xl">
          <p className="text-green mb-4 text-sm font-semibold tracking-wide uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            {doc.frontmatter.title}
          </h1>
          <p className="mt-6 text-lg text-white/80">{doc.frontmatter.audience}</p>
          <p className="mt-6 text-xs text-white/50">
            {t("updated", {
              date: format.dateTime(dateOnly(doc.frontmatter.updated), "long"),
            })}
          </p>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl">
          {/* The concession sits above the body on purpose: a comparison that hides it
              reads as marketing, and a reader who finds it late stops trusting the rest. */}
          <aside className="border-green bg-mint/40 rounded-[12px] border-l-4 p-6">
            <h2 className="text-lg">{t("concessionTitle")}</h2>
            <p className="mt-2">{doc.frontmatter.bestAlternativeWhen}</p>
          </aside>

          <div className="prose-dexee mt-10">
            {/* remark-gfm: without it the comparison tables, which are the point of
                these pages, render as one run-on paragraph. */}
            <MDXRemote source={doc.body} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
          </div>

          <div className="border-border mt-12 flex flex-wrap gap-3 border-t pt-8">
            <Button asChild variant="accent">
              <Link href="/for-companies">{t("ctaBrief")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">{t("ctaPricing")}</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section tone="mist">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl">{t("othersTitle")}</h2>
          <ul className="mt-6 space-y-3">
            {COMPARE_SLUGS.filter((other) => other !== slug).map((other) => (
              <li key={other}>
                <Link className="text-link underline" href={`/compare/${other}`}>
                  {t(`titles.${other}` as "titles.dexee-vs-eor-platforms")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
