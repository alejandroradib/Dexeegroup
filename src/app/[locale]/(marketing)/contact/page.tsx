import { getTranslations } from "next-intl/server";

import { ContactForm } from "@/components/domain/marketing/contact-form";
import { Button } from "@/components/ui/button";
import { pageLocale } from "@/i18n/server";
import { serverEnv } from "@/lib/env";
import { SITE } from "@/lib/site";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  return {
    title: t("contact"),
    description: t("contactDescription"),
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { en: "/en/contact", es: "/es/contact" },
    },
  };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  await pageLocale(params);
  const t = await getTranslations("marketing.contact");
  const calendly = serverEnv().CALENDLY_URL;
  return (
    <div className="container-marketing grid gap-12 py-16 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-3 max-w-xl">{t("subtitle")}</p>
        <div className="mt-8">
          <ContactForm />
        </div>
        <p className="text-muted-foreground mt-6 text-sm">
          {t.rich("direct", {
            email: () => (
              <a className="text-link underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            ),
          })}
        </p>
      </div>
      <aside className="bg-navy rounded-[12px] p-8 text-white lg:self-start">
        {calendly ? (
          <>
            <h2 className="text-xl text-white">{t("bookTitle")}</h2>
            <p className="mt-2 text-white/80">{t("bookBody")}</p>
            <Button asChild variant="accent" className="mt-6">
              <a href={calendly} target="_blank" rel="noreferrer">
                {t("bookCta")}
              </a>
            </Button>
          </>
        ) : null}
        <p className="mt-8 text-sm text-white/60">
          {SITE.legalName}
          <br />
          {SITE.city}
        </p>
      </aside>
    </div>
  );
}
