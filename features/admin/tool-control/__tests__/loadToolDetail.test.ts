const getJson = jest.fn();
jest.mock("@/lib/python-client", () => ({ getJson: (...a: unknown[]) => getJson(...a), postJson: jest.fn() }));
jest.mock("@/lib/supabase/authRetry", () => ({ runWithSessionRetry: (fn: () => unknown) => fn() }));
const rows: Record<string, unknown[]> = {
  catalog_entry: [{ tool_id: "t1", display_name: "Tool one" }],
  catalog_endpoint: [{ id: "e1", tool_id: "t1" }],
  catalog_provider: [{ slug: "p" }],
  endpoint_scorecard: [],
  endpoint_strip: [],
};
jest.mock("@/utils/supabase/client", () => {
  const chain = (table: string): unknown => {
    const q: Record<string, unknown> = {};
    for (const m of ["order", "range", "eq", "in"]) q[m] = () => q;
    q.then = (res: (v: unknown) => unknown) => res({ data: rows[table], count: rows[table].length, error: null });
    return q;
  };
  return { createClient: () => ({ schema: () => ({ from: (t: string) => ({ select: () => chain(t) }) }) }) };
});
jest.mock("@ai-matrx/data/db", () => ({
  readAllRows: async (page: (r: { from: number; to: number }) => Promise<{ data: unknown[] }>) => (await page({ from: 0, to: 999 })).data,
}));

import { loadToolDetail } from "../service";

beforeEach(() => getJson.mockReset());

test("server door answers: its data is used, the database is not read", async () => {
  getJson.mockResolvedValue({ data: { entry: { tool_id: "t1", display_name: "From server" }, endpoints: [] } });
  expect((await loadToolDetail("t1")).entry.display_name).toBe("From server");
});

test("server without the door (404): falls back to the previous database loader", async () => {
  getJson.mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));
  const d = await loadToolDetail("t1");
  expect(d.entry.display_name).toBe("Tool one");
  expect(d.endpoints).toHaveLength(1);
});

test("any other failure is shown, not swallowed", async () => {
  getJson.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
  await expect(loadToolDetail("t1")).rejects.toThrow("boom");
});
