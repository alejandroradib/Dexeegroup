import { describe, expect, it } from "vitest";

import { toPublicQuestion } from "@/lib/assessments/public-question";
import { pickClientIp } from "@/lib/client-ip";
import { safeEqual } from "@/lib/constant-time";
import { inviteIsUsable, INVITE_TTL_DAYS } from "@/lib/invites";
import { validateUploadPath } from "@/lib/storage/upload-path";

describe("C1: question payload never carries the scoring key", () => {
  it("strips answer_key and factor", () => {
    const q = toPublicQuestion({
      id: "q1",
      assessment_id: "a1",
      section: "disc",
      band: null,
      sort_order: 0,
      prompt: "I decide quickly.",
      question_type: "likert",
      options: { scale: { min: 1, max: 5 } },
      answer_key: { style: "D", reverse: false },
      weight: 1,
      factor: "D",
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    });
    expect(q).not.toHaveProperty("answer_key");
    expect(q).not.toHaveProperty("factor");
    expect(q.prompt).toBe("I decide quickly.");
  });
});

describe("C4: constant-time secret comparison", () => {
  it("matches equal strings and rejects different or empty ones", () => {
    expect(safeEqual("cron-secret-1", "cron-secret-1")).toBe(true);
    expect(safeEqual("cron-secret-1", "cron-secret-2")).toBe(false);
    expect(safeEqual("cron-secret-1", "cron-secret-10")).toBe(false);
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual(null, "x")).toBe(false);
  });
});

describe("C5: client IP comes from the platform, not the first forwarded hop", () => {
  const h = (map: Record<string, string>) => ({
    get: (name: string) => map[name.toLowerCase()] ?? null,
  });
  it("prefers the platform-injected header", () => {
    expect(
      pickClientIp(h({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1, 203.0.113.9" })),
    ).toBe("203.0.113.9");
  });
  it("uses the last hop of x-forwarded-for, which the proxy appended, never the first", () => {
    expect(pickClientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("falls back to unknown", () => {
    expect(pickClientIp(h({}))).toBe("unknown");
  });
});

describe("C6: signed upload paths", () => {
  const me = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  it("rejects dot segments even when the owned id appears in the path", () => {
    const result = validateUploadPath("logos", `companies/${me}/../${other}/logo.png`);
    expect(result.ok).toBe(false);
  });
  it("fixes the logo depth to companies/<id>/<file>", () => {
    expect(validateUploadPath("logos", `companies/${me}/logo.png`)).toEqual({
      ok: true,
      ownerId: me,
    });
    expect(validateUploadPath("logos", `companies/${me}/x/logo.png`).ok).toBe(false);
    expect(validateUploadPath("logos", `companies/${me}`).ok).toBe(false);
    expect(validateUploadPath("logos", `companies/./logo.png`).ok).toBe(false);
  });
  it("keeps the exact resume and audio anchors", () => {
    expect(validateUploadPath("resumes", `candidates/${me}/resume.pdf`)).toEqual({
      ok: true,
      ownerId: me,
    });
    expect(validateUploadPath("resumes", `candidates/${me}/../${other}/resume.pdf`).ok).toBe(false);
    expect(validateUploadPath("assessment-audio", `attempts/${me}/${other}.webm`)).toEqual({
      ok: true,
      ownerId: me,
    });
    expect(validateUploadPath("assessment-audio", `attempts/${me}/../x.webm`).ok).toBe(false);
  });
});

describe("C7: invitation expiry", () => {
  const now = new Date("2026-09-21T12:00:00Z");
  it("accepts a fresh invite and rejects an expired or used one", () => {
    expect(INVITE_TTL_DAYS).toBe(7);
    expect(
      inviteIsUsable({ accepted_at: null, invite_expires_at: "2026-09-22T00:00:00Z" }, now),
    ).toBe(true);
    expect(
      inviteIsUsable({ accepted_at: null, invite_expires_at: "2026-09-21T11:59:59Z" }, now),
    ).toBe(false);
    expect(
      inviteIsUsable({ accepted_at: "2026-09-20T00:00:00Z", invite_expires_at: null }, now),
    ).toBe(false);
  });
  it("treats a legacy invite without an expiry as expired", () => {
    expect(inviteIsUsable({ accepted_at: null, invite_expires_at: null }, now)).toBe(false);
  });
});
