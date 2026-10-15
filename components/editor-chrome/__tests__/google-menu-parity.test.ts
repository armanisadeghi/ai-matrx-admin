/**
 * Google parity (Arman, 2026-10-13: "add everything google has"): each editor's menu bar is
 * Google's — same menus in the same order — and every Google row we cannot run yet is a
 * REGISTERED Coming Soon promise (never a bare stub). The File menu follows Google's order.
 */
import { buildSheetMenus, type SheetChromeHost } from "@/features/workbooks/chrome/sheet-commands";
import { buildDocMenus, type DocChromeHost } from "@/features/documents/chrome/doc-commands";
import { buildDeckMenus, type DeckChromeHost } from "@/features/presentations/deck-commands";
import { buildEditorFileMenu } from "@/features/file-actions/editor-file-menu";
import { getComingSoon } from "@/lib/coming-soon/registry";
import { flattenMenus, type EditorMenu, type EditorMenuEntry } from "../editor-menu-model";

function anything(): never {
  const fn = function () {} as unknown as object;
  const proxy: unknown = new Proxy(fn, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => 1 : p === Symbol.iterator ? function* () {} : p === "then" ? undefined : proxy),
    apply: () => proxy,
  });
  return proxy as never;
}
const host = <T,>(base: Record<string, unknown>): T =>
  new Proxy(base, { get: (t, p) => (p in t ? t[p as string] : (anything() as unknown)) }) as unknown as T;

const editors: Array<[string, () => EditorMenu[], string[]]> = [
  ["workbook", () => buildSheetMenus(host<SheetChromeHost>({ editable: true, sendFeedback: () => {} })), ["edit", "view", "insert", "format", "data", "tools", "extensions", "help"]],
  ["document", () => buildDocMenus(host<DocChromeHost>({ editable: true, sendFeedback: () => {} })), ["edit", "view", "insert", "format", "tools", "extensions", "help"]],
  [
    "presentation",
    () =>
      buildDeckMenus(
        host<DeckChromeHost>({ canEdit: true, slideCount: 2, current: 0, presets: [], hasImage: false, sendFeedback: () => {} }),
      ),
    ["edit", "view", "insert", "format", "slide", "arrange", "tools", "extensions", "help"],
  ],
];

describe.each(editors)("%s menus", (_name, build, order) => {
  it("are Google's menus in Google's order (File is the shared menu before them)", () => {
    expect(build().map((m) => m.id)).toEqual(order);
  });
  it("every Coming Soon row names a registered promise", () => {
    const soon = flattenMenus(build()).filter((a) => a.soon);
    expect(soon.length).toBeGreaterThan(0);
    for (const a of soon) expect([a.id, getComingSoon(a.soon!)?.id]).toEqual([a.id, a.soon]);
  });
  it("has Help → Privacy, Terms and Send feedback wired (not Coming Soon)", () => {
    const rows = flattenMenus(build());
    for (const id of ["help.privacy", "help.terms", "help.feedback"]) expect(rows.find((r) => r.id === id)?.soon).toBeUndefined();
  });
});

const labels = (entries: EditorMenuEntry[]) => entries.map((e) => (e.kind === "separator" ? "|" : e.label));

describe("Page setup never rides another editor's promise", () => {
  const handlers = { download: () => {}, navigate: () => {} };
  const pageSetup = (product: "sheets" | "slides" | "docs") =>
    flattenMenus([{ id: "file", label: "File", items: buildEditorFileMenu({ product, rows: [], templatesHref: "/t", downloads: [] }, handlers) }]).find((r) => r.id === "file.page-setup");
  it("Sheets and Slides each announce their own registered promise, in words about their own page", () => {
    expect(pageSetup("sheets")?.soon).toBe("workbooks.page-setup");
    expect(pageSetup("slides")?.soon).toBe("presentations.page-setup");
    expect(getComingSoon("workbooks.page-setup")?.promise).toMatch(/print/i);
    expect(getComingSoon("presentations.page-setup")?.promise).toMatch(/slide size/i);
  });
});

describe("Google File menu", () => {
  const handlers = { share: () => {}, copy: () => {}, rename: () => {}, move: () => {}, trash: () => {}, saveAsTemplate: () => {}, download: () => {}, navigate: () => {} };
  const rows: EditorMenuEntry[] = ["file.new", "file.open", "file.import", "file.history", "file.print", "file.details"].map((id) => ({
    kind: "action",
    id,
    label: id,
    run: () => {},
  }));
  it("Sheets: Google's order and groups", () => {
    const menu = buildEditorFileMenu({ product: "sheets", rows, templatesHref: "/t", downloads: [{ label: "x", run: async () => {} }] }, handlers);
    expect(labels(menu)).toEqual([
      "New", "file.open", "file.import", "Make a copy", "|",
      "Share", "Email", "Download", "Approvals", "|",
      "Rename", "Move", "Move to trash", "|",
      "Version history", "Make available offline", "|",
      "file.details", "Security limitations", "Settings", "Page setup", "|",
      "file.print",
    ]);
    for (const a of flattenMenus([{ id: "file", label: "File", items: menu }]).filter((r) => r.soon)) expect(getComingSoon(a.soon!)).toBeDefined();
  });
  it("Slides: Import slides, Language and Page setup in Google's places; no owner rows without rights", () => {
    const menu = buildEditorFileMenu(
      { product: "slides", rows, templatesHref: "/t", downloads: [{ label: "ODP", soon: "presentations.download-odp" }] },
      { download: () => {}, navigate: () => {} },
    );
    const l = labels(menu);
    expect(l).toContain("Import slides");
    expect(l).toContain("Language");
    expect(l).toContain("Page setup");
    expect(l).not.toContain("Rename");
    expect(l).not.toContain("Move to trash");
    expect(l[l.length - 1]).toBe("file.print");
    expect(l.filter((x, i) => x === "|" && l[i + 1] === "|")).toEqual([]);
  });
});
