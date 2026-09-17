import Script from "next/script";

import { publicEnv } from "@/lib/env";

/** Plausible or GA4 behind NEXT_PUBLIC_ANALYTICS_PROVIDER (SPEC 13). Renders nothing when disabled. */
export function Analytics() {
  const env = publicEnv();
  if (env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible" && env.NEXT_PUBLIC_ANALYTICS_ID) {
    return <Script defer data-domain={env.NEXT_PUBLIC_ANALYTICS_ID} src="https://plausible.io/js/script.js" strategy="afterInteractive" />;
  }
  if (env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "ga4" && env.NEXT_PUBLIC_ANALYTICS_ID) {
    return (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${env.NEXT_PUBLIC_ANALYTICS_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${env.NEXT_PUBLIC_ANALYTICS_ID}', { anonymize_ip: true });`}
        </Script>
      </>
    );
  }
  return null;
}
