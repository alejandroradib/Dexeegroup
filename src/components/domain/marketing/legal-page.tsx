import { getFormatter, getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";

import { Alert } from "@/components/ui/alert";
import type { Locale } from "@/i18n/routing";
import { readLegalDocument, type LegalDocument } from "@/lib/legal-content";
import { dateOnly } from "@/lib/utils";

const LEGAL_UPDATED = "2026-09-01";

export async function LegalPage({
  doc,
  locale,
  title,
}: {
  doc: LegalDocument;
  locale: Locale;
  title: string;
}) {
  const source = await readLegalDocument(doc, locale);
  const t = await getTranslations("marketing.legal");
  const format = await getFormatter();
  return (
    <div className="container-marketing max-w-3xl py-16">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {t("updated", { date: format.dateTime(dateOnly(LEGAL_UPDATED), "long") })}
      </p>
      <Alert variant="warning" className="mt-6">
        {t("placeholderNotice")}
      </Alert>
      <div className="prose-dexee mt-8">
        <MDXRemote source={source} />
      </div>
    </div>
  );
}
