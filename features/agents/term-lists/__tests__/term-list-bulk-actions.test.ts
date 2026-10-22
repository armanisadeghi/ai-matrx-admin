/**
 * Archive and Restore are one declaration: the live rail section offers Archive, the Archived
 * section offers Restore, and each runs the same service door the single-list control uses.
 */
jest.mock("@/lib/toast", () => ({ toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
const archiveTermList = jest.fn(async (_id: string) => undefined);
const restoreTermList = jest.fn(async (_id: string) => undefined);
jest.mock("../service", () => ({
  archiveTermList: (id: string) => archiveTermList(id),
  restoreTermList: (id: string) => restoreTermList(id),
}));

import { termListBulkActions } from "../components/termListBulkActions";
import type { TermList } from "../types";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";

const list = (id: string) => ({ id, name: `List ${id}` }) as unknown as TermList;
const select = (rows: TermList[]): EntityBulkSelection<TermList> => ({
  mode: "ids",
  ids: rows.map((r) => r.id),
  rows,
  count: rows.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} },
});

beforeEach(() => jest.clearAllMocks());

describe("term list bulk twins", () => {
  it("offers Archive for live lists and Restore for archived ones", () => {
    expect(termListBulkActions("active").map((a) => a.id)).toEqual(["archive"]);
    expect(termListBulkActions("archived").map((a) => a.id)).toEqual(["restore"]);
  });

  it("Restore runs restoreTermList once per ticked archived list", async () => {
    const [restore] = termListBulkActions("archived");
    await restore.run(select([list("a"), list("b")]), {});
    expect(restoreTermList.mock.calls.map((c) => c[0]).sort()).toEqual(["a", "b"]);
    expect(archiveTermList).not.toHaveBeenCalled();
  });

  it("Archive names the count and runs archiveTermList per list", async () => {
    const [archive] = termListBulkActions("active");
    const sel = select([list("a"), list("b")]);
    expect(archive.confirm?.(sel)?.title).toBe("Archive 2 term lists?");
    await archive.run(sel, {});
    expect(archiveTermList).toHaveBeenCalledTimes(2);
  });
});
