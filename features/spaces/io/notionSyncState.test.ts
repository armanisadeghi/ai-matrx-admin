import { readFileSync } from "fs";
import { join } from "path";

const calls: unknown[][] = [];
let result: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null };
function chain() {
  const b: Record<string, unknown> = {};
  for (const m of ["schema", "from", "select", "eq", "is", "order", "limit"]) {
    b[m] = (...a: unknown[]) => {
      calls.push([m, ...a]);
      return b;
    };
  }
  b.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return b;
}
jest.mock("@/utils/supabase/client", () => ({ supabase: chain() }));

import { readNotionSyncState } from "./notionSyncState";

beforeEach(() => {
  calls.length = 0;
});

describe("the Notion sync state is read from custom.synced_source, not the server", () => {
  it("asks for the newest live notion_database source of the table", async () => {
    result = { data: [], error: null };
    await expect(readNotionSyncState("t1")).resolves.toEqual({ connected: false });
    expect(calls).toContainEqual(["schema", "custom"]);
    expect(calls).toContainEqual(["from", "synced_source"]);
    expect(calls).toContainEqual(["eq", "source_kind", "notion_database"]);
    expect(calls).toContainEqual(["eq", "target", "t1"]);
    expect(calls).toContainEqual(["is", "deleted_at", null]);
    expect(calls).toContainEqual(["order", "updated_at", { ascending: false }]);
    expect(calls).toContainEqual(["limit", 1]);
  });

  it("answers in the server's shape, folding the mapping into the report", async () => {
    result = {
      data: [{ source_ref: "n1", synced_at: "2026-10-16T00:00:00+00:00", last_report: { added: 2 }, mapping: { a: 1 } }],
      error: null,
    };
    await expect(readNotionSyncState("t1")).resolves.toEqual({
      connected: true,
      notion_id: "n1",
      kind: "database",
      synced_at: "2026-10-16T00:00:00+00:00",
      report: { added: 2, map: { a: 1 } },
    });
  });

  it("a database error is thrown, never read as not connected", async () => {
    result = { data: null, error: { message: "permission denied" } };
    await expect(readNotionSyncState("t1")).rejects.toThrow("permission denied");
  });

  it("the bar no longer GETs the server for it", () => {
    const src = readFileSync(join(__dirname, "NotionSyncBar.tsx"), "utf8");
    expect(src).not.toMatch(/getJson/);
  });
});
