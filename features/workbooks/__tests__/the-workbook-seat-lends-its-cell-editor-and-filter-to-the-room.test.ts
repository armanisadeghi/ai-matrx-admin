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
jest.mock("@univerjs/core", () => ({
  ICommandService: "ICommandService",
  IResourceLoaderService: "IResourceLoaderService",
  IUndoRedoService: "IUndoRedoService",
  IUniverInstanceService: "IUniverInstanceService",
}));
jest.mock("@univerjs/engine-formula", () => ({ IDefinedNamesService: "IDefinedNamesService" }));
jest.mock("@univerjs/preset-sheets-core", () => ({
  IEditorBridgeService: "IEditorBridgeService",
  SelectionMoveType: { ONLY_SET: 0 },
  SheetsSelectionsService: "SheetsSelectionsService",
}));
jest.mock("@univerjs/preset-sheets-filter", () => ({ SheetsFilterService: "SheetsFilterService" }));
const toast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

import { showWorkbookCollabNotice, startWorkbookOrderedRoom } from "../collab/workbookOrderedRoom";

function univerWith(services: Record<string, unknown>) {
  const get = (token: string) => {
    if (!(token in services)) throw new Error(`no ${token}`);
    return services[token];
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
    await startWorkbookOrderedRoom(args(univerWith({ IEditorBridgeService: bridge })));
    expect(captured.port?.cellEditor?.()).toEqual({ sheetId: "s1", row: 20, col: 1 });
    visible = false;
    expect(captured.port?.cellEditor?.()).toBeNull();

    await startWorkbookOrderedRoom(args(univerWith({})));
    expect(captured.port?.cellEditor?.()).toBeNull(); // no editor bridge: never throws into the room
  });

  it("reads a filter range with its rangeType (the package's one reader)", async () => {
    const range = { startRow: 4, endRow: 9, startColumn: 1, endColumn: 3, rangeType: 0 };
    const filters = { getFilterModel: (u: string, s: string) => (u === "unit" && s === "s1" ? { getRange: () => range } : null) };
    await startWorkbookOrderedRoom(args(univerWith({ SheetsFilterService: filters })));
    expect(captured.port?.filterRange?.("unit", "s1")).toEqual(range);
    expect(captured.port?.filterRange?.("unit", "s2")).toBeNull();

    await startWorkbookOrderedRoom(args(univerWith({})));
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
