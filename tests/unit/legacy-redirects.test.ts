import { describe, expect, it } from "vitest";

import { LEGACY_REDIRECTS, legacyRedirects } from "@/lib/seo/legacy-redirects";

const MARKETING_DIR = "src/app/[locale]/(marketing)";

describe("legacy Squarespace redirects", () => {
  it("covers the nine old pages with a 301 to an existing Spanish page", async () => {
    const { existsSync } = await import("node:fs");
    expect(LEGACY_REDIRECTS).toHaveLength(9);
    for (const entry of legacyRedirects()) {
      expect(entry.statusCode).toBe(301);
      expect(entry.source).toMatch(/^\/[a-z-]+\.html$/);
      expect(entry.destination).toMatch(/^\/es(\/|$)/);
      const page = entry.destination.replace(/^\/es\/?/, "");
      const file = page ? `${MARKETING_DIR}/${page}/page.tsx` : `${MARKETING_DIR}/page.tsx`;
      expect(existsSync(file), `${entry.destination} has no page`).toBe(true);
    }
  });
});
