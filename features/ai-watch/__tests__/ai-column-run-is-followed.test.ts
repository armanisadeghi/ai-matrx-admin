/**
 * An AI column run is followed in Watch AI row by row (lane AI-COLUMN, 2026-10-19): every row's call the server
 * stamped with the run's watch id becomes a step with its own user_request, and the run is over only when every
 * call is terminal.
 */


jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/features/agents/factory/service", () => ({ getFactoryBuild: async () => null }));

import { resolveAiColumnRun, type AiColumnCallRow } from "../followed-work-resolve";

const work = { key: "ai_column_run:w1", kind: "ai_column_run" as const, id: "w1", label: "AI column fill", source: "AI column", at: 0 };
const row = (id: string, status: string, at: string): AiColumnCallRow => ({
  id, conversation_id: `c-${id}`, status, error: null, total_cost: 0.0003, created_at: at,
  metadata: { record_id: `rec-${id}-xxxxxxxx`, mandate_key: "table.column_fill", ai_column_run_id: "w1", table_id: "t1", field_key: "review_topic" },
});

describe("resolveAiColumnRun", () => {
  it("lists every row's call as its own watchable step while the run is live", () => {
    const r = resolveAiColumnRun(work, [row("b", "pending", "2026-10-19T18:00:02Z"), row("a", "completed", "2026-10-19T18:00:01Z")]);
    expect(r.done).toBe(false);
    expect(r.userRequestIds).toEqual(["a", "b"]);
    expect(r.conversationIds).toEqual(["c-a", "c-b"]);
    expect(r.steps.map((s) => s.mandateKey)).toEqual(["table.column_fill", "table.column_fill"]);
    expect(r.inputs).toEqual({ table_id: "t1", field_key: "review_topic" });
  });

  it("is over only when every call is terminal, and never before a call exists", () => {
    expect(resolveAiColumnRun(work, []).done).toBe(false);
    expect(resolveAiColumnRun(work, [row("a", "completed", "1"), row("b", "failed", "2")]).done).toBe(true);
  });
});

describe("a run whose request ended (lane SERVER-STORE, 2026-10-19)", () => {
  it("closes as failed with the reason when the request failed before any AI call", () => {
    const r = resolveAiColumnRun({ ...work, ended: { ok: false, reason: "The data store is busy, try again.", at: 1 } }, []);
    expect(r.done).toBe(true);
    expect(r.status).toBe("failed");
    expect(r.error).toBe("The data store is busy, try again.");
  });

  it("is over with no call when the request succeeded and nothing was due", () => {
    expect(resolveAiColumnRun({ ...work, ended: { ok: true, at: 1 } }, []).done).toBe(true);
  });

  it("keeps waiting on calls still pending after a successful request", () => {
    expect(resolveAiColumnRun({ ...work, ended: { ok: true, at: 1 } }, [row("a", "pending", "1")]).done).toBe(false);
  });
});
