/**
 * Insert › Table of contents and Building blocks are BLOCKS: they go at a paragraph boundary, never
 * at a caret inside a heading's text. (Walk 2026-10-15: caret 11 chars into "Intro heading line",
 * the table landed inside the heading, which then read "ng line" and the table listed the broken half.)
 */
import { flattenMenus } from "@ai-matrx/office/core";
import { buildDocMenus, type DocChromeHost } from "../chrome/doc-commands";
import { blockInsertPlan } from "@ai-matrx/office/docs/tools";

const STREAM = "Intro heading line\rSome body text\r\n";

describe("where a block goes", () => {
  it("a caret inside a heading ends that heading first and inserts after it, never inside it", () => {
    expect(blockInsertPlan(STREAM, 11)).toEqual({ at: 19, breakAt: 18 });
  });
  it("a caret at the end of a line breaks the line and inserts on the new paragraph", () => {
    expect(blockInsertPlan(STREAM, 18)).toEqual({ at: 19, breakAt: 18 });
    expect(blockInsertPlan(STREAM, 33)).toEqual({ at: 34, breakAt: 33 });
  });
  it("a caret at the start of a paragraph, or in an empty one, inserts right there", () => {
    expect(blockInsertPlan(STREAM, 0)).toEqual({ at: 0, breakAt: null });
    expect(blockInsertPlan(STREAM, 19)).toEqual({ at: 19, breakAt: null });
    expect(blockInsertPlan("Title\r\r\n", 6)).toEqual({ at: 6, breakAt: null });
  });
});

describe("Insert › Table of contents", () => {
  it("moves the caret to a paragraph boundary BEFORE Univer inserts the table", async () => {
    const order: string[] = [];
    const host = {
      api: { executeCommand: (id: string) => (order.push(id), true) },
      editable: true,
      blockStart: async () => (order.push("blockStart"), true),
      unitId: () => "doc-1",
      zoom: () => 1,
      print: () => {},
      wordCount: () => {},
      fullScreen: () => false,
      toggleFullScreen: () => {},
    } as DocChromeHost;
    const row = flattenMenus(buildDocMenus(host)).find((r) => r.id === "insert.toc.insert")!;
    await row.run();
    expect(order).toEqual(["blockStart", "doc.command.insert-table-of-contents"]);
  });
  it("inserts nothing when there is no caret to place it at", async () => {
    const order: string[] = [];
    const host = {
      api: { executeCommand: (id: string) => (order.push(id), true) },
      editable: true,
      blockStart: async () => false,
      unitId: () => "doc-1",
      zoom: () => 1,
      print: () => {},
      wordCount: () => {},
      fullScreen: () => false,
      toggleFullScreen: () => {},
    } as DocChromeHost;
    await flattenMenus(buildDocMenus(host)).find((r) => r.id === "insert.toc.insert")!.run();
    expect(order).toEqual([]);
  });
});
