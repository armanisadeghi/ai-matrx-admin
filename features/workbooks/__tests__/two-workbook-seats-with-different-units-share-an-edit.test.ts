/**
 * TWO WORKBOOK SEATS, TWO UNIVER UNITS, ONE SHARED CELL EDIT.
 *
 * Each seat mounts its own Univer unit, so a peer's mutation arrives addressed
 * to the SENDER's unit. The editor states its own unit (`unitId`) so the room
 * re-addresses it, and a mutation that cannot be applied calls `onApplyFailed`.
 * WorkbookEditor takes both from `workbookSeatOptions`.
 *
 * Breaks that turn this red: a WorkbookEditor that stops passing the seat
 * options to its session; a seat that states no unit (the peer's edit lands
 * on a unit that does not exist here); a failed apply that is swallowed.
 */
import * as Y from "yjs";
import { readFileSync } from "fs";
import { join } from "path";

import {
  WorkbookCollabSession,
  type CollabMutationInfo,
  type CommandServiceLike,
} from "@ai-matrx/office/univer/collab";
import { workbookSeatOptions } from "@/features/workbooks/collab/workbookSeatOptions";

function makeRoom() {
  const docs = new Set<Y.Doc>();
  return ({ doc }: { doc: Y.Doc }) => {
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      for (const other of docs) if (other !== doc) Y.applyUpdate(other, update, "remote");
    };
    return {
      async connect() {
        for (const other of docs) Y.applyUpdate(doc, Y.encodeStateAsUpdate(other), "remote");
        docs.add(doc);
        doc.on("update", onUpdate);
      },
      disconnect() {
        doc.off("update", onUpdate);
        docs.delete(doc);
      },
      async ready() {},
    };
  };
}

/** A seat: its own unit id, a command service that only accepts ITS unit. */
function seat(unit: string, opts: { withSeatOptions: boolean; throwOnForeignUnit?: boolean }) {
  const listeners = new Set<(info: CollabMutationInfo) => void>();
  const cells: Record<string, string> = {};
  const failures: string[] = [];
  const service: CommandServiceLike = {
    onMutationExecutedForCollab: (l) => {
      listeners.add(l);
      return { dispose: () => listeners.delete(l) };
    },
    syncExecuteCommand: (_id, params) => {
      const p = params as { unitId: string; value: string };
      if (p.unitId !== unit) throw new Error(`no unit ${p.unitId} on this seat`);
      cells[unit] = p.value;
      return true;
    },
  };
  const api = { getActiveWorkbook: () => ({ getId: () => unit }) };
  const seatOptions = opts.withSeatOptions
    ? workbookSeatOptions({ getApi: () => api, onFailed: (id) => failures.push(id) })
    : {};
  const edit = (value: string) => {
    for (const l of listeners)
      l({ id: "sheet.mutation.set-range-values", type: 2, params: { unitId: unit, value } });
  };
  return { service, cells, failures, seatOptions, edit };
}

async function joinRoom(room: ReturnType<typeof makeRoom>, uid: string, s: ReturnType<typeof seat>) {
  const session = new WorkbookCollabSession({
    workbookId: "wb-1",
    uid,
    clientId: `c-${uid}`,
    commandService: s.service,
    makeProvider: room,
    ...s.seatOptions,
  });
  await session.start();
  return session;
}

describe("two seats with different Univer units", () => {
  it("share a cell edit both ways when each seat states its unit", async () => {
    const room = makeRoom();
    const ana = seat("unit-ana", { withSeatOptions: true });
    const ben = seat("unit-ben", { withSeatOptions: true });
    await joinRoom(room, "ana", ana);
    await joinRoom(room, "ben", ben);

    ana.edit("hello from ana");
    expect(ben.cells["unit-ben"]).toBe("hello from ana");
    ben.edit("hello from ben");
    expect(ana.cells["unit-ana"]).toBe("hello from ben");
    expect(ana.failures).toEqual([]);
    expect(ben.failures).toEqual([]);
  });

  it("a seat without the options never receives the edit (the pre-wiring bug)", async () => {
    const room = makeRoom();
    const ana = seat("unit-ana", { withSeatOptions: true });
    const ben = seat("unit-ben", { withSeatOptions: false });
    await joinRoom(room, "ana", ana);
    await joinRoom(room, "ben", ben);
    ana.edit("hello");
    expect(ben.cells["unit-ben"]).toBeUndefined();
  });

  it("a failed apply is reported to the seat, not swallowed", async () => {
    const room = makeRoom();
    const ana = seat("unit-ana", { withSeatOptions: true });
    const ben = seat("unit-ben", { withSeatOptions: true });
    ben.service.syncExecuteCommand = () => {
      throw new Error("boom");
    };
    await joinRoom(room, "ana", ana);
    await joinRoom(room, "ben", ben);
    ana.edit("x");
    expect(ben.failures).toEqual(["sheet.mutation.set-range-values"]);
  });

  it("WorkbookEditor wires the seat options into its session", () => {
    const src = readFileSync(
      join(process.cwd(), "features/workbooks/components/WorkbookEditor.tsx"),
      "utf8",
    );
    const call = src.slice(src.indexOf("new WorkbookCollabSession("));
    expect(call.slice(0, 1500)).toContain("...workbookSeatOptions(");
    expect(src).toMatch(/onFailed:[\s\S]{0,400}reloadFromLatest\(\)/);
  });
});
