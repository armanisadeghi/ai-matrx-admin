import { collectOutline } from "../chrome/doc-outline";
import { buildDocMenus, type DocChromeHost } from "../chrome/doc-commands";
import { flattenMenus } from "@/components/editor-chrome/editor-menu-model";

describe("document outline", () => {
  it("lists paragraph-style headings and sized bold headings, skips body text", () => {
    const snapshot = {
      body: {
        dataStream: "Intro\rBody text\rDetails\rPlain\r\n",
        paragraphs: [
          { startIndex: 5, paragraphStyle: { namedStyleType: 4 } },
          { startIndex: 15 },
          { startIndex: 22, paragraphStyle: {} },
          { startIndex: 28 },
        ],
        textRuns: [{ st: 16, ed: 22, ts: { bl: 1, fs: 22 } }],
      },
    };
    expect(collectOutline(snapshot)).toEqual([
      { level: 1, text: "Intro", offset: 0 },
      { level: 2, text: "Details", offset: 16 },
    ]);
  });
});

describe("headers, page numbers, spacing and contents are real rows", () => {
  it("each sends its Univer command", () => {
    const calls: unknown[][] = [];
    const host = {
      api: { executeCommand: (...a: unknown[]) => void calls.push(a) },
      editable: true,
      unitId: () => "d1",
      zoom: () => 1,
      print() {}, wordCount() {}, fullScreen: () => false, toggleFullScreen() {},
    } as unknown as DocChromeHost;
    const rows = flattenMenus(buildDocMenus(host));
    for (const id of ["insert.toc.insert", "format.line-spacing.double", "insert.headers-footers.footer"]) {
      void rows.find((r) => r.id === id)!.run();
    }
    expect(calls.map((c) => c[0])).toEqual([
      "doc.command.insert-table-of-contents",
      "doc-paragraph-setting.command",
      "doc.command.open-header-footer-panel",
    ]);
    expect(rows.some((r) => (r as { soon?: string }).soon?.match(/line-spacing|headers-footers|page-numbers|table-of-contents|show-outline/))).toBe(false);
  });
});
