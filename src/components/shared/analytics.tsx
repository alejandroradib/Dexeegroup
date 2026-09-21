import { headers } from "next/headers";
import Script from "next/script";

import { publicEnv } from "@/lib/env";

/**
 * Plausible or GA4 behind NEXT_PUBLIC_ANALYTICS_PROVIDER (SPEC 13). Renders nothing when
 * disabled. Scripts carry the per-request CSP nonce set by the proxy (audit H1); without it
 * 'strict-dynamic' would block them.
 */
export async function Analytics() {
  const env = publicEnv();
  if (env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "none" || !env.NEXT_PUBLIC_ANALYTICS_ID) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  if (env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible" && env.NEXT_PUBLIC_ANALYTICS_ID) {
    return (
      <Script
        defer
        nonce={nonce}
        data-domain={env.NEXT_PUBLIC_ANALYTICS_ID}
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
    );
  }
  if (env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "ga4" && env.NEXT_PUBLIC_ANALYTICS_ID) {
    return (
      <>
        <Script
          nonce={nonce}
          src={`https://www.googletagmanager.com/gtag/js?id=${env.NEXT_PUBLIC_ANALYTICS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" nonce={nonce} strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${env.NEXT_PUBLIC_ANALYTICS_ID}', { anonymize_ip: true });`}
        </Script>
      </>
    );
  }
  return null;
}
