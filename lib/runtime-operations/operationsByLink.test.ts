/** Seam test: by-link lookups go to Supabase (runtime.global_execution), never the Python server. */
type Row = Record<string, unknown>;
let rows: Row[] = [];
let events: Array<{ root_execution_id: string; seq: number }> = [];
const calls: Array<{ schema: string; table: string; eq: Record<string, unknown> }> = [];

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: (schema: string) => ({
      from: (table: string) => {
        const call = { schema, table, eq: {} as Record<string, unknown> };
        calls.push(call);
        const q: any = {
          select: () => q,
          eq: (k: string, v: unknown) => ((call.eq[k] = v), q),
          in: (k: string, ids: string[]) => ((q._in = { k, ids }), (q._ids = k === "id" ? ids : undefined), q),
          is: (k: string, v: unknown) => ((q._is = { k, v }), q),
          not: () => q,
          order: () => q,
          limit: () => q,
          then: (res: (v: unknown) => unknown) =>
            res(table === "global_execution_event"
              ? { data: events.filter((e) => e.root_execution_id === call.eq.root_execution_id).sort((a, b) => b.seq - a.seq).slice(0, 1), error: null }
              : {
              data: q._in
                ? rows.filter(
                    (r) => q._in.ids.includes(r[q._in.k]) && (!q._is || (r[q._is.k] ?? null) === q._is.v),
                  )
                : rows.filter((r) => r.link_id === call.eq.link_id),
              error: null,
            }),
        };
        return q;
      },
    }),
  }),
}));
const serverFetch = jest.fn();
jest.mock("@/lib/api/server-api", () => ({ serverApi: serverFetch, NO_ERROR_CAPTURE_HEADER: "x" }));

import { fetchOperationsByLink } from "./operationsByLink";

const base = { parent_execution_id: null, cost: 0, meters: {}, error: null, started_at: null, ended_at: null, type: "t" };

beforeEach(() => {
  calls.length = 0;
  serverFetch.mockReset();
});

it("rs_topic: reads runtime.global_execution, active run first, no server call", async () => {
  rows = [
    { ...base, id: "a", request_id: "ra", root_execution_id: "a", status: "completed", link_kind: "rs_topic", link_id: "T", created_at: "2026-01-02" },
    { ...base, id: "b", request_id: "rb", root_execution_id: "b", status: "running", link_kind: "rs_topic", link_id: "T", created_at: "2026-01-01" },
  ];
  const out = await fetchOperationsByLink("rs_topic", "T");
  expect(calls[0]).toMatchObject({ schema: "runtime", table: "global_execution", eq: { link_kind: "rs_topic", link_id: "T" } });
  expect(out.operation_count).toBe(2);
  expect(out.operations[0]).toMatchObject({ execution_id: "b", is_terminal: false, root_request_id: "rb" });
  expect(serverFetch).not.toHaveBeenCalled();
});

it("conversation: collapses a child link to its root", async () => {
  rows = [
    { ...base, id: "child", parent_execution_id: "root", request_id: "rc", root_execution_id: "root", status: "running", link_kind: "conversation", link_id: "C", created_at: "2026-01-02" },
    { ...base, id: "root", request_id: "rr", root_execution_id: "root", status: "running", link_kind: "x", link_id: "other", created_at: "2026-01-01" },
  ];
  const out = await fetchOperationsByLink("conversation", "C");
  expect(out.operation_count).toBe(1);
  expect(out.operations[0].execution_id).toBe("root");
  expect(out.operations[0].request_id).toBe("rr");
});

it("nothing linked answers an empty list", async () => {
  rows = [];
  expect((await fetchOperationsByLink("rs_topic", "none")).operation_count).toBe(0);
});

it("a superseded auto run is hidden when the work opened its own root for that request", async () => {
  rows = [
    { ...base, id: "auto", request_id: "R1", root_execution_id: "auto", status: "completed", link_kind: "doc", link_id: "D", created_at: "2026-01-02", stream_mode: "auto" },
    { ...base, id: "real", request_id: "R1", root_execution_id: "real", status: "completed", link_kind: "doc", link_id: "D", created_at: "2026-01-01", stream_mode: null },
    // an auto run with no root of its own for its request stays visible
    { ...base, id: "lone", request_id: "R2", root_execution_id: "lone", status: "running", link_kind: "doc", link_id: "D", created_at: "2026-01-03", stream_mode: "auto" },
  ];
  const out = await fetchOperationsByLink("doc", "D");
  expect(out.operations.map((o) => o.execution_id).sort()).toEqual(["lone", "real"]);
});

it("a superseded auto run still shows under a conversation link (server rule: non-conversation only)", async () => {
  rows = [
    { ...base, id: "auto", request_id: "R1", root_execution_id: "auto", status: "completed", link_kind: "conversation", link_id: "C2", created_at: "2026-01-02", stream_mode: "auto" },
    { ...base, id: "real", request_id: "R1", root_execution_id: "real", status: "completed", link_kind: "x", link_id: "o", created_at: "2026-01-01", stream_mode: null },
  ];
  const out = await fetchOperationsByLink("conversation", "C2");
  expect(out.operations.map((o) => o.execution_id)).toEqual(["auto"]);
});

it("eventCursor: each operation carries the newest event seq and its public paths (what a follower resumes from)", async () => {
  rows = [
    { ...base, id: "run1", request_id: "r1", root_execution_id: "run1", status: "running", link_kind: "processed_document", link_id: "P", created_at: "2026-01-02" },
  ];
  events = [
    { root_execution_id: "run1", seq: 3 },
    { root_execution_id: "run1", seq: 9 },
    { root_execution_id: "other", seq: 99 },
  ];
  const withCursor = await fetchOperationsByLink("processed_document", "P", 5, { eventCursor: true });
  expect(withCursor.operations[0]).toMatchObject({
    last_event_seq: 9,
    events_path: "/api/runtime/executions/run1/events",
    stream_path: "/api/runtime/executions/run1/events/stream",
  });
  // not asked for: no extra read, and no invented cursor
  const plain = await fetchOperationsByLink("processed_document", "P", 5);
  expect(plain.operations[0].last_event_seq).toBeUndefined();
});
