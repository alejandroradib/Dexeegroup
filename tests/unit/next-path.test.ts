import { describe, expect, it } from "vitest";

import { nextPathWithoutLocale } from "@/lib/auth/next-path";

const isLocale = (s: string) => s === "en" || s === "es";

/** Audit I18: the sign-in action prefixes the locale itself, so `next` must not carry one. */
describe("next path for sign-in", () => {
  it("drops the locale prefix and keeps the query", () => {
    expect(nextPathWithoutLocale("/en/candidate/jobs", "?page=2", isLocale)).toBe(
      "/candidate/jobs?page=2",
    );
    expect(nextPathWithoutLocale("/es/company", "", isLocale)).toBe("/company");
  });
  it("leaves paths without a locale untouched and never returns an empty path", () => {
    expect(nextPathWithoutLocale("/candidate", "", isLocale)).toBe("/candidate");
    expect(nextPathWithoutLocale("/es", "", isLocale)).toBe("/");
    expect(nextPathWithoutLocale("/", "?x=1", isLocale)).toBe("/?x=1");
  });
});
