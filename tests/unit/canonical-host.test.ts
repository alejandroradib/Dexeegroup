import { describe, expect, it } from "vitest";

import { canonicalRedirect } from "@/lib/canonical-host";

/**
 * Guards CORRECCIONES-3 G2: in production every non-API request on a non-canonical host is
 * sent to the canonical one, path and query intact; nothing else ever redirects.
 */
const SITE = "https://dexeegroup.com";
const req = (href: string) => new URL(href);

describe("canonical host redirect", () => {
  it("sends www to the apex keeping path and query", () => {
    expect(
      canonicalRedirect({
        url: req("https://www.dexeegroup.com/es/sign-up?next=%2Fcandidate"),
        host: "www.dexeegroup.com",
        siteUrl: SITE,
        vercelEnv: "production",
      }),
    ).toBe("https://dexeegroup.com/es/sign-up?next=%2Fcandidate");
  });

  it("sends the vercel.app alias to the apex", () => {
    expect(
      canonicalRedirect({
        url: req("https://dexeegroup.vercel.app/en/jobs"),
        host: "dexeegroup.vercel.app",
        siteUrl: SITE,
        vercelEnv: "production",
      }),
    ).toBe("https://dexeegroup.com/en/jobs");
  });

  it("does not redirect the canonical host, whatever the case or trailing dot", () => {
    for (const host of ["dexeegroup.com", "DexeeGroup.com", "dexeegroup.com."]) {
      expect(
        canonicalRedirect({ url: req(`${SITE}/es`), host, siteUrl: SITE, vercelEnv: "production" }),
      ).toBeNull();
    }
  });

  it("never redirects the API, so cron and webhooks are not bounced", () => {
    for (const path of ["/api/cron/process-outbox", "/api/health", "/api"]) {
      expect(
        canonicalRedirect({
          url: req(`https://dexeegroup.vercel.app${path}`),
          host: "dexeegroup.vercel.app",
          siteUrl: SITE,
          vercelEnv: "production",
        }),
      ).toBeNull();
    }
  });

  it("never redirects outside production", () => {
    for (const env of ["preview", "development", undefined]) {
      expect(
        canonicalRedirect({
          url: req("https://dexeegroup-git-branch.vercel.app/es"),
          host: "dexeegroup-git-branch.vercel.app",
          siteUrl: SITE,
          vercelEnv: env,
        }),
      ).toBeNull();
    }
  });

  it("uses the forwarded host over the URL host when present", () => {
    expect(
      canonicalRedirect({
        url: req("https://internal/es"),
        host: "www.dexeegroup.com",
        siteUrl: SITE,
        vercelEnv: "production",
      }),
    ).toBe("https://dexeegroup.com/es");
  });

  it("refuses to redirect towards a localhost or IP site URL, so a bad variable cannot loop", () => {
    for (const bad of ["http://localhost:3000", "http://127.0.0.1:3000", "not a url"]) {
      expect(
        canonicalRedirect({
          url: req("https://www.dexeegroup.com/es"),
          host: "www.dexeegroup.com",
          siteUrl: bad,
          vercelEnv: "production",
        }),
      ).toBeNull();
    }
  });
});
