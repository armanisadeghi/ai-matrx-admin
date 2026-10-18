// THE BREAK (2026-10-17). `custom.data_home_tables` answers a SET; PostgREST cuts a set at its max-rows
// (1,000) in no order. A person with 2,006 tables (most of them the app's own) got a thousand of them,
// and the Board's picker showed 398 — the table she wanted ("Colors (section test 10-17)") was not
// among them, though the data home listed it. This fake store cuts a set the way PostgREST does and
// answers `custom.data_home` as one value; every list door must still return every table.
import type { RecordsDataSource } from "@ai-matrx/records";

import { dataHomeTables } from "../doors";
import { tablesToPick } from "../tablePicking";

const ROW_CAP = 1000;

function row(i: number, kept: boolean) {
  return {
    table_id: `t-${i}`,
    table_name: kept ? `Status ${i} choices` : `Table ${i}`,
    organization_id: "o",
    organization_name: "Org",
    member: true,
    visibility: "private",
    updated_at: "2026-10-17T00:00:00Z",
    mine: true,
    shared_with_me: false,
    platform_owned: kept,
    kind: kept ? "list" : "table",
  };
}

// 2,006 tables: the wanted one sits LAST, past the cap, behind 1,600 the app keeps for itself.
const ALL = [...Array.from({ length: 2005 }, (_, i) => row(i, i % 5 !== 0)), { ...row(9999, false), table_name: "Colors (section test 10-17)" }];

function cappedStore(): RecordsDataSource {
  return {
    rpc: async (fn: string) => {
      if (fn === "data_home_tables") return { data: ALL.slice(0, ROW_CAP), error: null };
      if (fn === "data_home") return { data: { tables: ALL, items: [], changed_by: [] }, error: null };
      return { data: null, error: { message: `unexpected ${fn}` } };
    },
  } as unknown as RecordsDataSource;
}

describe("a table picker is not cut short by the store's row cap", () => {
  it("dataHomeTables returns every table, past 1,000 rows", async () => {
    const answered = await dataHomeTables(cappedStore(), null);
    expect(answered.ok).toBe(true);
    if (answered.ok) expect(answered.data).toHaveLength(ALL.length);
  });

  it("the table behind the cap is offered by the picker", async () => {
    const answered = await dataHomeTables(cappedStore(), null);
    if (!answered.ok) throw new Error("did not answer");
    expect(tablesToPick(answered.data).map((t) => t.table_name)).toContain("Colors (section test 10-17)");
  });
});
