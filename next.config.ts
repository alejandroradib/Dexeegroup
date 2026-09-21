import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : undefined;
  } catch {
    return undefined;
  }
})();

// The Content-Security-Policy header is built per request in src/proxy.ts, where the
// script nonce lives (audit H1). Only the static headers stay here.

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Keep next dev from appending its agent-rules block to CLAUDE.md (the project file is curated by hand).
  agentRules: false,
  // Dev only: without this, next dev blocks /_next/hmr over 127.0.0.1 and the client
  // bundle never loads, so every form falls back to a native GET submit.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  serverExternalPackages: ["pino", "@react-pdf/renderer"],
};

export default withNextIntl(nextConfig);
