import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards CORRECCIONES-3 G3: without an email provider the outbox must never mark a row as
 * sent. Before the fix, `sendTemplateEmail` returned `{ id: null }` and `processOutbox` took
 * that for success, so a deployment with no provider looked healthy while nothing left.
 */

type Row = Record<string, unknown>;

let rows: Row[] = [];
const updates: { patch: Row; filters: Record<string, unknown> }[] = [];

/** Minimal stand-in for the supabase-js builder covering what processOutbox uses. */
function builder() {
  let mode: "select" | "update" = "select";
  let patch: Row = {};
  const filters: Record<string, unknown> = {};
  const lte: Record<string, unknown> = {};
  const chain: Record<string, unknown> = {};
  const matching = () =>
    rows.filter(
      (r) =>
        Object.entries(filters).every(([k, v]) => r[k] === v) &&
        Object.entries(lte).every(([k, v]) => String(r[k]) <= String(v)),
    );
  const apply = () => {
    const hit = matching();
    if (mode === "update") {
      updates.push({ patch, filters: { ...filters } });
      for (const r of hit) Object.assign(r, patch);
    }
    return hit.map((r) => ({ ...r }));
  };
  chain.select = () => chain;
  chain.update = (p: Row) => {
    mode = "update";
    patch = p;
    return chain;
  };
  chain.eq = (k: string, v: unknown) => {
    filters[k] = v;
    return chain;
  };
  chain.lte = (k: string, v: unknown) => {
    lte[k] = v;
    return chain;
  };
  chain.lt = chain.lte;
  chain.gte = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.maybeSingle = async () => ({ data: apply()[0] ?? null, error: null });
  chain.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: apply(), error: null, count: matching().length });
  return chain;
}

const configuredRef = { value: false };
const sendMock = vi.fn(async (): Promise<{ id: string | null; delivered: boolean }> => ({
  id: "resend-1",
  delivered: true,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => builder() }) }));
vi.mock("@/lib/email/send", () => ({
  emailConfigured: () => configuredRef.value,
  sendTemplateEmail: (...args: unknown[]) => sendMock(...(args as [])),
}));

function seed() {
  rows = [
    {
      id: "a",
      to: "x@example.com",
      template: "lead-acknowledgement",
      locale: "es",
      payload: {},
      status: "pending",
      attempts: 0,
      last_error: null,
      scheduled_for: "2026-01-01T00:00:00.000Z",
      sent_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "b",
      to: "y@example.com",
      template: "lead-acknowledgement",
      locale: "en",
      payload: {},
      status: "pending",
      attempts: 0,
      last_error: null,
      scheduled_for: "2026-01-01T00:00:00.000Z",
      sent_at: null,
      created_at: "2026-01-01T00:00:01.000Z",
    },
  ];
  updates.length = 0;
  sendMock.mockClear();
}

describe("outbox without an email provider", () => {
  beforeEach(() => {
    configuredRef.value = false;
    seed();
  });

  it("marks no row as sent and parks every claimed row as skipped", async () => {
    const { processOutbox } = await import("@/server/services/outbox");
    const result = await processOutbox();
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(2);
    expect(rows.every((r) => r.status === "skipped")).toBe(true);
    expect(rows.every((r) => r.sent_at === null)).toBe(true);
    expect(rows.every((r) => r.last_error === "no_provider")).toBe(true);
    expect(updates.some((u) => u.patch.status === "sent")).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("does not burn retry attempts while parked", async () => {
    const { processOutbox } = await import("@/server/services/outbox");
    await processOutbox();
    expect(rows.every((r) => r.attempts === 0)).toBe(true);
  });
});

describe("outbox once a provider is configured", () => {
  beforeEach(() => {
    configuredRef.value = true;
    seed();
  });

  it("requeues rows parked for lack of provider and sends them", async () => {
    Object.assign(rows[0] as Row, { status: "skipped", last_error: "no_provider" });
    const { processOutbox } = await import("@/server/services/outbox");
    const result = await processOutbox();
    expect(result.requeued).toBe(1);
    expect(result.sent).toBe(2);
    expect(rows.every((r) => r.status === "sent" && r.sent_at !== null)).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("parks instead of sending if the provider reports it did not deliver", async () => {
    sendMock.mockResolvedValueOnce({ id: null, delivered: false });
    const { processOutbox } = await import("@/server/services/outbox");
    const result = await processOutbox();
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(rows.filter((r) => r.status === "skipped")).toHaveLength(1);
    expect(rows.filter((r) => r.status === "sent")).toHaveLength(1);
  });
});
