/**
 * Content Security Policy for HTML responses (audit H1).
 *
 * Built per request in the proxy so `script-src` can carry a nonce and `'strict-dynamic'`
 * instead of `'unsafe-inline'`. The JSON-LD injection was closed at the source; this is the
 * layer that would have contained the next one. Pure so the production shape is testable.
 */
export type CspInput = {
  /** Base64 nonce for this response; every executable inline script must carry it. */
  nonce: string;
  /** `NEXT_PUBLIC_SUPABASE_URL`; only its exact origin is allowed, never a wildcard. */
  supabaseUrl: string;
  /** Which analytics scripts are loaded; anything else stays out of the policy. */
  analyticsProvider: "none" | "plausible" | "ga4";
  /** Development needs eval for React refresh; production never gets it. */
  dev: boolean;
};

const ANALYTICS_SCRIPT: Record<CspInput["analyticsProvider"], string[]> = {
  none: [],
  plausible: ["https://plausible.io"],
  ga4: ["https://www.googletagmanager.com"],
};

const ANALYTICS_CONNECT: Record<CspInput["analyticsProvider"], string[]> = {
  none: [],
  plausible: ["https://plausible.io"],
  ga4: ["https://www.google-analytics.com", "https://www.googletagmanager.com"],
};

/** `https://xyz.supabase.co` and `wss://xyz.supabase.co` for the configured project only. */
export function supabaseOrigins(supabaseUrl: string): { https: string; wss: string } | null {
  try {
    const url = new URL(supabaseUrl);
    return { https: `https://${url.host}`, wss: `wss://${url.host}` };
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(input: CspInput): string {
  const supabase = supabaseOrigins(input.supabaseUrl);
  const scriptSrc = [
    "'self'",
    `'nonce-${input.nonce}'`,
    "'strict-dynamic'",
    ...(input.dev ? ["'unsafe-eval'"] : []),
    // Host entries are ignored by browsers that honour 'strict-dynamic' and kept as the
    // fallback for the ones that do not.
    ...ANALYTICS_SCRIPT[input.analyticsProvider],
  ];
  const connectSrc = [
    "'self'",
    ...(supabase ? [supabase.https, supabase.wss] : []),
    ...ANALYTICS_CONNECT[input.analyticsProvider],
  ];
  const mediaSrc = ["'self'", "blob:", ...(supabase ? [supabase.https] : [])];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    `media-src ${mediaSrc.join(" ")}`,
    "frame-src https://calendly.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(input.dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** 128 bits of randomness, base64: what the CSP spec asks of a nonce. Edge-runtime safe. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
