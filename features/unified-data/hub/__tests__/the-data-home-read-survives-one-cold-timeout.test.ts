// DEFECT 84 (Q-12, 2026-10-22): /data's first load hit `custom.data_home` cold (a 55-organization
// admin: 1.4 s warm, 8.8 s on the first cold call, past the request's 8 s statement timeout, 57014 +
// HTTP 500). The first call warms what the second reads, so the home door asks ONCE more on a statement
// timeout before it tells the person it failed. Any other refusal is never retried, and a second
// timeout is still the store's failure, said plainly (nothing fails silently).
import type { RecordsDataSource } from "@ai-matrx/records";

import { dataHome, dataHomeSearch } from "../doors";

const timeout = { message: "canceling statement due to statement timeout", code: "57014" };
const answer = { tables: [{ table_id: "t1" }], items: [], changed_by: [] };

function source(replies: Array<{ data: unknown; error: unknown }>, calls: string[]): RecordsDataSource {
  return {
    rpc: async (fn: string) => {
      calls.push(fn);
      return replies[Math.min(calls.length - 1, replies.length - 1)];
    },
  } as unknown as RecordsDataSource;
}

describe("custom.data_home on a cold statement timeout", () => {
  it("asks once more and answers the second reply", async () => {
    const calls: string[] = [];
    const out = await dataHome(source([{ data: null, error: timeout }, { data: answer, error: null }], calls));
    expect(calls).toEqual(["data_home", "data_home"]);
    expect(out.ok && out.data.tables.map((t) => t.table_id)).toEqual(["t1"]);
  });

  it("the search door does the same", async () => {
    const calls: string[] = [];
    const out = await dataHomeSearch(source([{ data: null, error: timeout }, { data: answer, error: null }], calls), "x");
    expect(calls).toHaveLength(2);
    expect(out.ok).toBe(true);
  });

  it("a second timeout is still a failure, with the store's sqlstate", async () => {
    const calls: string[] = [];
    const out = await dataHome(source([{ data: null, error: timeout }], calls));
    expect(calls).toHaveLength(2);
    expect(!out.ok && out.error.sqlstate).toBe("57014");
  });

  it("any other refusal is asked once and passed on", async () => {
    const calls: string[] = [];
    const out = await dataHome(source([{ data: null, error: { message: "no", code: "42501" } }], calls));
    expect(calls).toHaveLength(1);
    expect(!out.ok && out.error.sqlstate).toBe("42501");
  });
});
