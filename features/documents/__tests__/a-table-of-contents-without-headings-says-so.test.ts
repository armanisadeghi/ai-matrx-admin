/**
 * GUARD (2026-10-16): Insert › Table of contents on a document with no heading did nothing at all —
 * Univer inserts an empty nothing. The command must say why (a notice) and send no command.
 */
import { buildDocMenus, TOC_NEEDS_A_HEADING, type DocChromeHost } from "../chrome/doc-commands";
import { countStyledHeadings } from "../chrome/doc-outline";
import { flattenMenus, type EditorMenuEntry } from "@ai-matrx/office/core";

const plain = { body: { dataStream: "Just text\r\n", paragraphs: [{ startIndex: 9 }] } };
const headed = { body: { dataStream: "Intro\r\n", paragraphs: [{ startIndex: 5, paragraphStyle: { namedStyleType: 4 } }] } };

function host(snapshot: unknown) {
  const sent: string[] = [];
  const notices: string[] = [];
  const h = {
    api: { executeCommand: (id: string) => (sent.push(id), true) },
    editable: true,
    unitId: () => "doc-1",
    headingCount: () => countStyledHeadings(snapshot),
    notice: (title: string) => notices.push(title),
    zoom: () => 1,
    print: () => {},
    wordCount: () => {},
    fullScreen: () => false,
    toggleFullScreen: () => {},
    tools: { open: () => {}, mode: () => "editing", setMode: () => {}, ruler: () => false, toggleRuler: () => {}, imageOptions: () => {} },
    show: { outline: () => false, toggleOutline: () => {} },
  } as unknown as DocChromeHost;
  const entry = flattenMenus(buildDocMenus(h)).find((e: EditorMenuEntry) => e.kind === "action" && e.id === "insert.toc.insert");
  return { run: () => (entry as { run: () => unknown }).run(), sent, notices };
}

describe("Insert › Table of contents", () => {
  it("on a document without a heading says so and inserts nothing", async () => {
    const h = host(plain);
    expect(await h.run()).toBe(false);
    expect(h.notices).toEqual([TOC_NEEDS_A_HEADING]);
    expect(h.sent).toEqual([]);
  });

  it("on a document with a heading inserts the table", async () => {
    const h = host(headed);
    await h.run();
    expect(h.notices).toEqual([]);
    expect(h.sent).toContain("doc.command.insert-table-of-contents");
  });
});
