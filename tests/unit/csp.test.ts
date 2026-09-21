import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, generateNonce, supabaseOrigins } from "@/lib/security/csp";

/**
 * Guards CORRECCIONES-3 H1: the production policy carries no 'unsafe-eval', no Supabase
 * wildcard and no 'unsafe-inline' for scripts; scripts run only with the per-request nonce.
 */
const prod = (over: Partial<Parameters<typeof buildContentSecurityPolicy>[0]> = {}) =>
  buildContentSecurityPolicy({
    nonce: "abc123",
    supabaseUrl: "https://cvvilveklqsznsefaaek.supabase.co",
    analyticsProvider: "none",
    dev: false,
    ...over,
  });

function directive(csp: string, name: string): string {
  const found = csp.split("; ").find((d) => d.startsWith(`${name} `));
  if (!found) throw new Error(`directive ${name} missing`);
  return found;
}

describe("content security policy", () => {
  it("production never allows eval and never uses the Supabase wildcard", () => {
    const csp = prod();
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("*.supabase.co");
  });

  it("scripts run only with the request nonce and strict-dynamic", () => {
    const script = directive(prod(), "script-src");
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
  });

  it("connects only to the configured Supabase project, over https and wss", () => {
    const connect = directive(prod(), "connect-src");
    expect(connect).toContain("https://cvvilveklqsznsefaaek.supabase.co");
    expect(connect).toContain("wss://cvvilveklqsznsefaaek.supabase.co");
    expect(connect).not.toContain("plausible");
    expect(connect).not.toContain("google");
  });

  it("adds analytics hosts only for the configured provider", () => {
    expect(prod({ analyticsProvider: "plausible" })).toContain("https://plausible.io");
    expect(prod({ analyticsProvider: "plausible" })).not.toContain("googletagmanager");
    expect(prod({ analyticsProvider: "ga4" })).toContain("https://www.googletagmanager.com");
    expect(prod({ analyticsProvider: "ga4" })).not.toContain("plausible");
  });

  it("keeps the frame, object and base restrictions", () => {
    const csp = prod();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("development gets eval for React refresh, and only development", () => {
    expect(prod({ dev: true })).toContain("'unsafe-eval'");
    expect(prod({ dev: false })).not.toContain("'unsafe-eval'");
  });

  it("derives exact origins and tolerates a broken URL", () => {
    expect(supabaseOrigins("https://x.supabase.co")).toEqual({
      https: "https://x.supabase.co",
      wss: "wss://x.supabase.co",
    });
    expect(supabaseOrigins("nope")).toBeNull();
  });

  it("generates distinct base64 nonces of 128 bits", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });
});
