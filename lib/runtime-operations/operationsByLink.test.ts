/** Seam test: by-link lookups go to Supabase (runtime.global_execution), never the Python server. */
type Row = Record<string, unknown>;
let rows: Row[] = [];
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
          in: (_k: string, ids: string[]) => ((q._ids = ids), q),
          order: () => q,
          limit: () => q,
          then: (res: (v: unknown) => unknown) =>
            res({
              data: q._ids ? rows.filter((r) => q._ids.includes(r.id)) : rows.filter((r) => r.link_id === call.eq.link_id),
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
