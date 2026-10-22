/**
 * THE WORKBOOK SEAT LENDS ITS OPEN CELL EDITOR AND ITS FILTERS TO THE CO-EDITING ROOM (office COLLAB-DESIGN §26).
 *
 * Without `cellEditor`, a collaborator's value landing on the cell someone is typing in spliced into their draft
 * ("$1,234.50" vs "$7" became 507). Without the package's `filterServiceRange`, a filter range lost its `rangeType`
 * and that seat saved differently from the others (hash_mismatch). A heal that changed the screen says so once.
 *
 * Breaks that turn this red: a port built without `cellEditor`, a hand-built filter reader that drops `rangeType`,
 * a `resynced` notice that shows nothing.
 */
const captured: { port?: Record<string, any> } = {};

jest.mock("@ai-matrx/office/univer/collab", () => {
  const actual = jest.requireActual("@ai-matrx/office/univer/collab");
  return {
    ...actual,
    univerSheetsOtPort: (o: Record<string, any>) => {
      captured.port = o;
      return { dispose() {} };
    },
    startWorkbookOtRoom: async () => ({ stop() {} }),
  };
});
// the filter preset's UI half needs a canvas (Path2D) jsdom lacks: the seat only uses its service token
jest.mock("@univerjs/preset-sheets-filter", () => ({ SheetsFilterService: class SheetsFilterService {} }));
const toast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

import { IEditorBridgeService } from "@univerjs/preset-sheets-core";
import { SheetsFilterService } from "@univerjs/preset-sheets-filter";

import { showWorkbookCollabNotice, startWorkbookOrderedRoom } from "../collab/workbookOrderedRoom";

/** An editor whose injector answers only the services given (every other service is a stand-in object). */
function univerWith(services: Map<unknown, unknown>) {
  const get = (token: unknown) => {
    if (services.has(token)) return services.get(token);
    if (token === IEditorBridgeService || token === SheetsFilterService) throw new Error("not registered");
    return {};
  };
  return { __getInjector: () => ({ get }) } as never;
}

const args = (univer: never) => ({
  univer,
  workbookId: "wb",
  uid: "u",
  clientId: "c",
  unitId: () => "unit",
  load: () => {},
  markDirty: () => {},
  onAwareness: () => {},
});

describe("the workbook seat's port", () => {
  it("lends the open cell editor's cell, and null when the editor is closed or missing", async () => {
    let visible = true;
    const bridge = { isVisible: () => ({ visible }), getEditLocation: () => ({ sheetId: "s1", row: 20, column: 1 }) };
    await startWorkbookOrderedRoom(args(univerWith(new Map([[IEditorBridgeService, bridge]]))));
    expect(captured.port?.cellEditor?.()).toEqual({ sheetId: "s1", row: 20, col: 1 });
    visible = false;
    expect(captured.port?.cellEditor?.()).toBeNull();

    await startWorkbookOrderedRoom(args(univerWith(new Map())));
    expect(captured.port?.cellEditor?.()).toBeNull(); // no editor bridge: never throws into the room
  });

  it("reads a filter range with its rangeType (the package's one reader)", async () => {
    const range = { startRow: 4, endRow: 9, startColumn: 1, endColumn: 3, rangeType: 0 };
    const filters = { getFilterModel: (u: string, s: string) => (u === "unit" && s === "s1" ? { getRange: () => range } : null) };
    await startWorkbookOrderedRoom(args(univerWith(new Map([[SheetsFilterService, filters]]))));
    expect(captured.port?.filterRange?.("unit", "s1")).toEqual(range);
    expect(captured.port?.filterRange?.("unit", "s2")).toBeNull();

    await startWorkbookOrderedRoom(args(univerWith(new Map())));
    expect(captured.port?.filterRange?.("unit", "s1")).toBeNull(); // no filter plugin
  });
});

describe("a sheet refreshed to match everyone else", () => {
  it("shows one short line", () => {
    toast.mockClear();
    showWorkbookCollabNotice({ kind: "resynced", reason: "hash_mismatch" });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({ title: "Your sheet was refreshed to match everyone else" });
  });
});
