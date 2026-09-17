import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Analytics } from "@/components/shared/analytics";
import { CookieNotice } from "@/components/shared/cookie-notice";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/server";
import { publicEnv } from "@/lib/env";
import { inter, montserrat } from "@/lib/fonts";

import type { Metadata } from "next";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "marketing.meta" });
  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("defaultTitle"), template: "%s | Dexee" },
    description: t("defaultDescription"),
    applicationName: "Dexee",
    icons: {
      icon: [{ url: "/favicon.ico" }, { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: "/brand/apple-icon.png",
    },
    openGraph: {
      type: "website",
      siteName: "Dexee",
      locale: locale === "es" ? "es_CO" : "en_US",
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "common.actions" });

  return (
    <html lang={locale} className={`${inter.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <TooltipProvider delayDuration={200}>
            <ToastProvider closeLabel={t("close")}>
              {children}
              <CookieNotice enabled={publicEnv().NEXT_PUBLIC_ANALYTICS_PROVIDER === "ga4"} />
            </ToastProvider>
          </TooltipProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
