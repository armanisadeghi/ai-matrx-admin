/**
 * THE GUARD for the live readers (COLLAB-DESIGN §7.5): a download, a "Make a copy", an export, a template save or a
 * Google push of a Doc or Sheet must read the record's CURRENT content through `lib/collab/current-content.ts`
 * (via `lib/collab/current-record.ts`), never the newest snapshot row, which is only the last save.
 *
 * It fails when:
 *   1. a file outside the reviewed list reads a snapshot door directly (`getLatestSnapshot`, `getLatestDocumentSnapshot`,
 *      or `.from("udt_*_snapshots")`),
 *   2. a reviewed file stops reading one (a stale list entry hides the next addition),
 *   3. the Docs / Sheets host stops handing the office package `readCurrentSnapshot` (Make a copy then copies the last save),
 *   4. the list menus' downloads or the Google push stop going through `current-record`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Files that may read a snapshot row directly, and why that is not a download / copy / export. */
const REVIEWED: Record<string, string> = {
  "lib/collab/current-record.ts": "the one reader's own snapshot door (the fallback `readCurrentContent` calls)",
  "features/documents/components/DocumentEditor.tsx": "the editor loads its own initial content and is itself the live room",
  "features/documents/document-model/documentModels.ts": "the editor's document model (its own working copy)",
  "features/workbooks/components/WorkbookEditor.tsx": "the editor loads its own initial content and is itself the live room",
  "features/workbooks/components/WorkbookHistoryViewer.tsx": "version history shows SAVED versions by definition",
  "features/documents/components/DocumentHistoryViewer.tsx": "version history shows SAVED versions by definition",
  "lib/univer-host.ts": "image-ownership check: reads the newest snapshot's id and author, never its content",
  "features/workbooks/table-link/link-service.ts": "reads ONE named snapshot (the last-synced baseline), a saved version by definition",
  "features/google-workspace/linked/EditorGoogleLinks.tsx": "reads only the newest snapshot ID (a version marker); its content reads use current-record",
};

const DIRECT = /\bgetLatestSnapshot\b|\bgetLatestDocumentSnapshot\b|\.from\(\s*["']udt_(?:document|workbook)_snapshots["']\s*\)/;

function sourceFiles(): string[] {
  return execFileSync("git", ["ls-files", "--", "*.ts", "*.tsx"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64e6 })
    .split("\n")
    .filter((f) => f && /^(features|lib|components|app|hooks|providers|utils)\//.test(f))
    .filter((f) => !/(__tests__|\.test\.|\.spec\.|\.d\.ts$)/.test(f));
}

describe("every download, copy and export reads the live room", () => {
  const readers = sourceFiles().filter((f) => DIRECT.test(read(f)));

  it("no file outside the reviewed list reads a snapshot row directly", () => {
    const unreviewed = readers.filter((f) => !(f in REVIEWED));
    expect(unreviewed).toEqual([]);
  });

  it("every reviewed entry still reads one (a stale entry would hide the next addition)", () => {
    expect(Object.keys(REVIEWED).filter((f) => !readers.includes(f))).toEqual([]);
  });

  it("the Docs and Sheets hosts give Make a copy the live reader", () => {
    for (const [file, reader] of [
      ["lib/docs-host.ts", "readCurrentDocument"],
      ["lib/sheets-host.ts", "readCurrentWorkbook"],
    ] as const) {
      const src = read(file);
      expect(src).toMatch(/readCurrentSnapshot\s*\(/);
      expect(src).toContain('import("@/lib/collab/current-record")');
      expect(src).toContain(reader);
    }
  });

  it("the host really answers with the folded content, not the last save", async () => {
    jest.resetModules();
    const readCurrentDocument = jest.fn(async () => ({ snapshot: { live: "doc" }, source: "folded", notice: null }));
    const readCurrentWorkbook = jest.fn(async () => ({ snapshot: { live: "book" }, source: "folded", notice: null }));
    jest.doMock("@/lib/collab/current-record", () => ({ readCurrentDocument, readCurrentWorkbook }));
    jest.doMock("@/lib/python-client", () => ({ requestRaw: jest.fn() }));
    jest.doMock("@/utils/supabase/client", () => ({ supabase: {} }));
    jest.doMock("@/features/files/handler/handler", () => ({ fileHandler: {} }));
    jest.doMock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));
    await import("@/lib/docs-host");
    await import("@/lib/sheets-host");
    const { getDocsHost } = await import("@ai-matrx/office/docs/host");
    const { getSheetsHost } = await import("@ai-matrx/office/sheets");
    expect((await getDocsHost().readCurrentSnapshot!("d1")).snapshot).toEqual({ live: "doc" });
    expect((await getSheetsHost().readCurrentSnapshot!("w1")).snapshot).toEqual({ live: "book" });
    expect(readCurrentDocument).toHaveBeenCalledWith("d1");
    expect(readCurrentWorkbook).toHaveBeenCalledWith("w1");
  });

  it("the list menus' downloads and the Google push read through current-record", () => {
    const adapters = read("features/file-actions/adapters.ts");
    expect(adapters).toContain('from "@/lib/collab/current-record"');
    expect(adapters).not.toMatch(DIRECT);
    const google = read("features/google-workspace/linked/EditorGoogleLinks.tsx");
    expect(google).toMatch(/readLocal:[\s\S]{0,120}readCurrent(?:Workbook|Document)\(/);
  });
});
