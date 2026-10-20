/**
 * A LINK MADE IN A CELL REACHES EVERY LINKED LIST. A cell write goes through the records client, which
 * writes the `record -> thing` edge inside the store; the associations store (what every Linked list
 * reads) was never told, so the row page said "Nothing linked yet" until a reload.
 *
 * Breaks: `followRecordWrites` not bound in getAssociationsStore -> "the host store follows" red;
 * the reload dropped -> "a loaded record reads its edges again" red; reading records nobody shows ->
 * "an unloaded record costs no read" red.
 */
const rpcMock = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => rpcMock(fn, args), from: jest.fn(), schema: jest.fn() },
}));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: jest.fn(() => { throw new Error("Not authenticated"); }) }));

import { announceRecordChanged } from "@ai-matrx/records/core";
import { getAssociationsStore, followRecordWrites } from "../associationsStore";

const REC = "00000000-0000-0000-0000-0000000000aa";

function fakeStore(status: "idle" | "ready") {
  return { getEdges: jest.fn(() => ({ status, edges: [] })), load: jest.fn(async () => {}) };
}

describe("a link made in a cell reaches every Linked list", () => {
  it("a loaded record reads its edges again when the records client writes it", () => {
    const s = fakeStore("ready");
    const off = followRecordWrites(s as never);
    announceRecordChanged(REC);
    off();
    expect(s.load).toHaveBeenCalledWith("record", REC, { force: true });
  });

  it("an unloaded record costs no read", () => {
    const s = fakeStore("idle");
    const off = followRecordWrites(s as never);
    announceRecordChanged(REC);
    off();
    expect(s.load).not.toHaveBeenCalled();
  });

  it("the host store follows record writes", () => {
    const store = getAssociationsStore();
    jest.spyOn(store, "getEdges").mockReturnValue({ status: "ready", edges: [] } as never);
    const load = jest.spyOn(store, "load").mockResolvedValue(undefined);
    announceRecordChanged(REC);
    expect(load).toHaveBeenCalledWith("record", REC, { force: true });
    jest.restoreAllMocks();
  });
});
