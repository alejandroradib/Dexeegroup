import { describe, expect, it } from "vitest";

import { buildAbsoluteAlternates, buildAlternates } from "@/lib/seo/alternates";
import { dateOnly } from "@/lib/utils";

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

describe("date-only formatting", () => {
  it("keeps a content date on its own calendar day in Bogotá", () => {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      dateStyle: "long",
    }).format(dateOnly("2026-09-20"));
    expect(formatted).toContain("September 20");
  });

  it("keeps it on the same day east of UTC too", () => {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      dateStyle: "long",
    }).format(dateOnly("2026-09-20"));
    expect(formatted).toContain("September 20");
  });
});
