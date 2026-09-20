import { describe, expect, it } from "vitest";

import { buildAbsoluteAlternates, buildAlternates } from "@/lib/seo/alternates";

describe("hreflang alternates", () => {
  it("emits every locale plus x-default", () => {
    const alternates = buildAlternates("es", "/pricing");
    expect(alternates.canonical).toBe("/es/pricing");
    expect(alternates.languages).toEqual({
      en: "/en/pricing",
      es: "/es/pricing",
      "x-default": "/en/pricing",
    });
  });

  it("points x-default at English, which is what a US buyer reads", () => {
    expect(buildAlternates("es").languages["x-default"]).toBe("/en");
  });

  it("handles the home page without leaving a trailing slash", () => {
    expect(buildAlternates("en").canonical).toBe("/en");
    expect(buildAlternates("en", "/").canonical).toBe("/en");
    expect(buildAlternates("en", "").languages.es).toBe("/es");
  });

  it("builds absolute URLs for the sitemap, where relative ones are invalid", () => {
    expect(buildAbsoluteAlternates("https://dexeegroup.com", "/jobs/accountant")).toEqual({
      en: "https://dexeegroup.com/en/jobs/accountant",
      es: "https://dexeegroup.com/es/jobs/accountant",
      "x-default": "https://dexeegroup.com/en/jobs/accountant",
    });
  });
});
