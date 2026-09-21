import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards CORRECCIONES-3 G1. With the public view gone, the only way a candidate sees a
 * question is through `getAttemptWithQuestions`: it must return exactly the items assigned to
 * the attempt, in the assigned order, and nothing that scores them.
 */

type Row = Record<string, unknown>;

const BANK: Row[] = ["q1", "q2", "q3", "q4", "q5"].map((id, i) => ({
  id,
  assessment_id: "asmt",
  section: "grammar",
  band: "B1",
  sort_order: i,
  prompt: `Prompt ${id}`,
  question_type: "mcq",
  options: { choices: [], bank_id: `gr-${id}` },
  answer_key: { correct: "a" },
  factor: "N",
  weight: 1,
  is_active: true,
  created_at: "2026-09-01T00:00:00Z",
}));

const ATTEMPT: Row = {
  id: "att-1",
  assessment_id: "asmt",
  candidate_id: "cand-1",
  status: "in_progress",
  question_ids: ["q4", "q2", "q5"],
  expires_at: null,
};

/** Minimal chainable stand-in for the supabase-js query builder, enough for this service. */
function table(rows: Row[]) {
  let result = rows;
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = (col: string, val: unknown) => {
    result = result.filter((r) => r[col] === val);
    return chain;
  };
  chain.in = (col: string, vals: unknown[]) => {
    result = result.filter((r) => vals.includes(r[col]));
    return chain;
  };
  chain.maybeSingle = async () => ({ data: result[0] ?? null, error: null });
  chain.single = async () => ({ data: result[0] ?? null, error: null });
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: result, error: null });
  return chain;
}

const fromMock = vi.fn((name: string) => {
  switch (name) {
    case "assessment_attempts":
      return table([ATTEMPT]);
    case "assessments":
      return table([{ id: "asmt", type: "english_written", is_active: true }]);
    case "assessment_questions":
      return table(BANK);
    case "assessment_answers":
      return table([]);
    default:
      throw new Error(`unexpected table ${name}`);
  }
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: fromMock }) }));
vi.mock("@/lib/ai/anthropic", () => ({ completeJson: vi.fn(), aiConfigured: () => false }));
vi.mock("@/lib/ai/transcription", () => ({
  transcribe: vi.fn(),
  transcriptionConfigured: () => false,
}));
vi.mock("@/server/services/events", () => ({ dispatchEvent: vi.fn() }));

describe("attempt questions after the public view is gone", () => {
  beforeEach(() => {
    fromMock.mockClear();
  });

  it("returns exactly the assigned questions, in the assigned order", async () => {
    const { getAttemptWithQuestions } = await import("@/server/services/assessments");
    const result = await getAttemptWithQuestions("att-1", "cand-1");
    expect(result).not.toBeNull();
    expect(result!.questions.map((q) => q.id)).toEqual(["q4", "q2", "q5"]);
  });

  it("never returns the scoring key or the factor", async () => {
    const { getAttemptWithQuestions } = await import("@/server/services/assessments");
    const result = await getAttemptWithQuestions("att-1", "cand-1");
    for (const q of result!.questions) {
      expect(q).not.toHaveProperty("answer_key");
      expect(q).not.toHaveProperty("factor");
      expect(q.prompt).toMatch(/^Prompt q/);
    }
  });

  it("returns nothing for an attempt that belongs to another candidate", async () => {
    const { getAttemptWithQuestions } = await import("@/server/services/assessments");
    expect(await getAttemptWithQuestions("att-1", "someone-else")).toBeNull();
  });

  it("reads the questions table only with the attempt's ids", async () => {
    const { getAttemptWithQuestions } = await import("@/server/services/assessments");
    await getAttemptWithQuestions("att-1", "cand-1");
    const tables = fromMock.mock.calls.map((c) => c[0]);
    expect(tables).toContain("assessment_questions");
    expect(tables).not.toContain("assessment_questions_public");
  });
});
