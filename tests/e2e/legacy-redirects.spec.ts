import { expect, test } from "@playwright/test";

import { LEGACY_REDIRECTS } from "../../src/lib/seo/legacy-redirects";

// Fase J, 0.5: every page of the previous site answers 301 to its new Spanish page.
test.describe("legacy Squarespace URLs", () => {
  for (const { source, destination } of LEGACY_REDIRECTS) {
    test(`${source} moves permanently to ${destination}`, async ({ request }) => {
      const response = await request.get(source, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(new URL(response.headers()["location"] ?? "", "http://x").pathname).toBe(destination);
    });
  }
});
