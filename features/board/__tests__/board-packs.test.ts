// "Use template" for a board pack is ALL OR NOTHING and never leaves a half board beside a retry:
// a failed page deletes what was made; an unfinished earlier run (journal) is deleted before the next starts;
// a finished run clears the journal, so pressing Use again is a deliberate NEW board. And one pack the
// gallery cannot read is skipped and reported, while the others still list.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACK = JSON.parse(readFileSync(join(__dirname, "../../spaces/templates/packs/design-system-board.pack.json"), "utf8"));
const { spec, ...pack } = PACK;
const TEMPLATE = { id: "t1", catalogue_id: "SP0363", version: PACK.version, spec, pack };
// Every table the committed pack declares (its board's tiles name them), never a hand-kept list that goes stale.
const TABLES = Object.fromEntries((spec.tables as { token: string }[]).map(({ token }) => [token, { tableId: `tbl-${token}`, viewIds: {} }]));

const readSpaceTemplate = jest.fn();
const listSpaceTemplates = jest.fn();
const installTemplateTables = jest.fn(async () => TABLES);
jest.mock("@/features/spaces/templates/use-pack", () => ({
  readSpaceTemplate: (...a: unknown[]) => readSpaceTemplate(...a),
  listSpaceTemplates: (...a: unknown[]) => listSpaceTemplates(...a),
  installTemplateTables: (...a: unknown[]) => installTemplateTables(...(a as [])),
}));
let n = 0;
const createBoardFromDocument = jest.fn(async (input: { title: string }) => ({ id: `board-${++n}`, title: input.title }));
const deleteBoard = jest.fn(async (_id: string) => undefined);
jest.mock("../persistence/boardsService", () => ({
  createBoardFromDocument: (input: { title: string }) => createBoardFromDocument(input),
  deleteBoard: (id: string) => deleteBoard(id),
  LAYOUT_SETTING: "layout",
  PARENT_BOARD_SETTING: "parent_board_id",
}));
jest.mock("../templates/starter-notes", () => ({ materializeStarterNotes: async (doc: unknown) => doc }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async (id: string | null) => id ?? "org" }));
const captureError = jest.fn();
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: (...a: unknown[]) => captureError(...a) }));

import { listBoardPacks, makeBoardFromPack, type BoardPackRunJournal } from "../templates/board-packs";

function memoryJournal(start: string[] | null = null, install: string | null = null): BoardPackRunJournal & { now: () => string[] | null; installNow: () => string | null } {
  let ids = start;
  let copy = install;
  return {
    read: () => ids,
    write: (next) => void (ids = next && next.length ? [...next] : null),
    readInstall: () => copy,
    writeInstall: (next) => void (copy = next),
    now: () => ids,
    installNow: () => copy,
  };
}
const dispatch = jest.fn() as never;

describe("makeBoardFromPack", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    n = 0;
    readSpaceTemplate.mockResolvedValue(TEMPLATE);
  });

  it("a page that fails deletes the top board already made and throws; nothing is left behind", async () => {
    const journal = memoryJournal();
    createBoardFromDocument.mockImplementationOnce(async (i) => ({ id: "root", title: i.title })).mockRejectedValueOnce(new Error("network"));
    await expect(makeBoardFromPack("pack:t1", "org", "Design system", dispatch, undefined, () => journal)).rejects.toThrow(/not finished \(network\).*deleted/);
    expect(deleteBoard.mock.calls).toEqual([["root"]]);
    expect(journal.now()).toBeNull();
  });

  it("a retry deletes the earlier unfinished boards first (pages before the top board), then makes a whole new set", async () => {
    const journal = memoryJournal(["old-root", "old-page"]);
    const root = await makeBoardFromPack("pack:t1", "org", "Design system", dispatch, undefined, () => journal);
    expect(deleteBoard.mock.calls).toEqual([["old-page"], ["old-root"]]);
    expect(deleteBoard.mock.invocationCallOrder[1]).toBeLessThan(createBoardFromDocument.mock.invocationCallOrder[0]);
    expect(root.id).toBe("board-1");
    expect(createBoardFromDocument).toHaveBeenCalledTimes(2);
    expect(journal.now()).toBeNull();
  });

  it("an unfinished copy that cannot be deleted stops the run before anything new is made", async () => {
    const journal = memoryJournal(["stuck"]);
    deleteBoard.mockRejectedValueOnce(new Error("permission denied"));
    await expect(makeBoardFromPack("pack:t1", "org", "Design system", dispatch, undefined, () => journal)).rejects.toThrow(/could not be deleted/);
    expect(createBoardFromDocument).not.toHaveBeenCalled();
    expect(installTemplateTables).not.toHaveBeenCalled();
    expect(journal.now()).toEqual(["stuck"]);
  });

  it("every use is its own design system: a FRESH table copy named for the board, and Use again makes another", async () => {
    const journal = memoryJournal();
    const a = await makeBoardFromPack("pack:t1", "org", "Acme design system", dispatch, undefined, () => journal);
    expect(journal.now()).toBeNull();
    const fresh = (installTemplateTables.mock.calls[0] as unknown[])[5] as { title: string; installId: string | null };
    expect(fresh).toMatchObject({ title: "Acme design system", installId: null });
    const b = await makeBoardFromPack("pack:t1", "org", "Globex design system", dispatch, undefined, () => journal);
    expect(a.id).not.toBe(b.id);
    expect(((installTemplateTables.mock.calls[1] as unknown[])[5] as { title: string }).title).toBe("Globex design system");
    expect(deleteBoard).not.toHaveBeenCalled();
  });

  it("Try again continues the SAME fresh copy an unfinished run started, and a finished run forgets it", async () => {
    const journal = memoryJournal(null, "install-7");
    installTemplateTables.mockImplementationOnce((async (...a: unknown[]) => {
      const fresh = a[5] as { installId: string | null; onInstallId: (id: string) => void };
      expect(fresh.installId).toBe("install-7");
      fresh.onInstallId("install-7");
      return TABLES;
    }) as never);
    await makeBoardFromPack("pack:t1", "org", "Acme design system", dispatch, undefined, () => journal);
    expect(journal.installNow()).toBeNull();
  });
});

describe("listBoardPacks", () => {
  it("skips and reports a pack it cannot read; the others still list", async () => {
    listSpaceTemplates.mockResolvedValue([
      { id: "bad", catalogue_id: "SP9998", space: { title: "Broken", description: "", board: { title: "Broken" } } },
      { id: "t1", catalogue_id: "SP0363", space: { title: "Design system board", description: "d", board: { title: "Design system" } } },
    ]);
    readSpaceTemplate.mockImplementation(async (id: string) => {
      if (id === "bad") throw new Error("corrupt pack");
      return TEMPLATE;
    });
    const errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const packs = await listBoardPacks();
    expect(packs.map((p) => p.key)).toEqual(["pack:t1"]);
    expect(captureError).toHaveBeenCalledWith(expect.objectContaining({ code: "board_pack_unreadable", message: expect.stringContaining("SP9998") }));
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
