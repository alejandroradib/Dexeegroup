import { describe, expect, it } from "vitest";

import { backoffMinutes } from "@/lib/email/backoff";

import { EMAIL_COPY, fillTemplate, isTemplateName } from "../../emails/copy";
import { buildEmail } from "../../emails/index";

describe("email templates", () => {
  it("has every SPEC 12 template in both locales", () => {
    for (const template of ["company-status", "job-status", "new-application", "application-status", "contact-released", "recommendation", "assessment-result", "invite"]) {
      expect(isTemplateName(template)).toBe(true);
      expect(EMAIL_COPY[template as keyof typeof EMAIL_COPY].en.subject).toBeTruthy();
      expect(EMAIL_COPY[template as keyof typeof EMAIL_COPY].es.subject).toBeTruthy();
    }
  });
  it("fills placeholders and drops missing ones", () => {
    expect(fillTemplate("Hello {name}, {missing} done", { name: "Ana" })).toBe("Hello Ana, done");
  });
  it("builds absolute, locale-prefixed CTA links", () => {
    const email = buildEmail("new-application", "es", { job: "Contador", candidate: "Laura G.", link: "/company/jobs/1/pipeline" }, "https://dexeegroup.com");
    expect(email.subject).toBe("Nuevos postulantes para Contador");
    expect(email.props.ctaUrl).toBe("https://dexeegroup.com/es/company/jobs/1/pipeline");
    expect(email.props.body).toContain("Laura G.");
  });
});

describe("outbox backoff", () => {
  it("grows exponentially and caps at one hour", () => {
    expect(backoffMinutes(1)).toBe(2);
    expect(backoffMinutes(3)).toBe(8);
    expect(backoffMinutes(10)).toBe(60);
  });
});
