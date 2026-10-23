/**
 * F-B: typing "/" in the middle of text ("Date 10/22/2026") opened Univer's insert menu and swallowed everything after it.
 * Google's rule: the menu opens only at the start of an empty paragraph or after a space; a key typed into an open menu
 * closes it and keeps every character. This runs against the REAL installed Univer service class.
 */
import { DocParagraphMenuService } from "@univerjs/docs-ui";

import { installSlashMenuRule, slashMayOpenAt, typeThroughSlashMenu } from "../univer-slash-menu-rule";

describe("slashMayOpenAt", () => {
  const text = "Date 10/22/2026\r\n";
  test("never inside a word or number: 'Date 10/22/2026' keeps every character", () => {
    expect(slashMayOpenAt(text, text.indexOf("/"))).toBe(false); // after "10"
    expect(slashMayOpenAt(text, text.lastIndexOf("/"))).toBe(false); // after "22"
    expect(slashMayOpenAt("a/b ok\r\n", 1)).toBe(false);
    expect(slashMayOpenAt("https://x\r\n", 6)).toBe(false);
  });
  test("opens at the start of an empty paragraph and after a space", () => {
    expect(slashMayOpenAt("\r\n", 0)).toBe(true);
    expect(slashMayOpenAt("one\r\r\n", 4)).toBe(true);
    expect(slashMayOpenAt("see \r\n", 4)).toBe(true);
  });
  test("not at the start of a paragraph that already has text", () => {
    expect(slashMayOpenAt("hello\r\n", 0)).toBe(false);
    expect(slashMayOpenAt("one\rhello\r\n", 4)).toBe(false);
  });
});

describe("the rule is installed on Univer's real service", () => {
  test("before it is installed Univer opens the menu on a mid-number '/' (the defect)", () => {
    const proto = DocParagraphMenuService.prototype as unknown as { _shouldOpenSlashMenu: (c: unknown) => boolean };
    const svc = Object.create(proto) as Record<string, unknown>;
    svc._canEditDocument = () => true;
    svc._getCollapsedTextRange = () => ({ startOffset: 7, endOffset: 7, collapsed: true, segmentId: "" });
    expect(proto._shouldOpenSlashMenu.call(svc, { event: { key: "/", altKey: false, ctrlKey: false, metaKey: false } })).toBe(true);
  });

  test("the private methods it relies on still exist in the installed Univer", () => {
    const proto = DocParagraphMenuService.prototype as unknown as Record<string, unknown>;
    for (const name of ["_shouldOpenSlashMenu", "_shouldOpenSlashMenuFromInput", "_openSlashMenu", "_getCollapsedTextRange", "hideParagraphMenu"]) {
      expect([name, typeof proto[name]]).toEqual([name, "function"]);
    }
  });

  test("a mid-text '/' is refused by both Univer paths, a '/' after a space is not", () => {
    expect(installSlashMenuRule()).toBe(true);
    expect(installSlashMenuRule()).toBe(true); // idempotent
    const proto = DocParagraphMenuService.prototype as unknown as {
      _shouldOpenSlashMenu: (c: unknown) => boolean;
      _shouldOpenSlashMenuFromInput: (c: unknown) => boolean;
    };
    const stream = "Date 10/22 and x\r\n";
    const svc = Object.create(proto) as Record<string, unknown>;
    let offset = 7; // after "Date 10"
    svc._context = { unitId: "d", unit: { getBody: () => ({ dataStream: stream }) } };
    svc._canEditDocument = () => true;
    svc._docSelectionManagerService = { getActiveTextRange: () => null };
    svc._getCollapsedTextRange = () => ({ startOffset: offset, endOffset: offset, collapsed: true, segmentId: "" });
    const key = { event: { key: "/", altKey: false, ctrlKey: false, metaKey: false } };
    const input = { event: { data: "/" }, content: "/" };
    expect(proto._shouldOpenSlashMenu.call(svc, key)).toBe(false);
    expect(proto._shouldOpenSlashMenuFromInput.call(svc, input)).toBe(false);
    offset = stream.indexOf("and"); // right after the space
    expect(proto._shouldOpenSlashMenu.call(svc, key)).toBe(true);
    expect(proto._shouldOpenSlashMenuFromInput.call(svc, input)).toBe(true);
  });
});

describe("a key typed into an open menu closes it and keeps the characters", () => {
  test("'/' and the key are inserted where the caret was, and the menu is hidden", () => {
    const calls: unknown[][] = [];
    let hidden = false;
    const svc = {
      _matrxSlash: { offset: 12, segmentId: "" },
      _context: { unitId: "doc-1", with: () => ({ syncExecuteCommand: (...a: unknown[]) => calls.push(a) }) },
      hideParagraphMenu: () => {
        hidden = true;
      },
    };
    expect(typeThroughSlashMenu(svc as never, "5")).toBe(true);
    expect(hidden).toBe(true);
    expect(calls).toEqual([
      ["doc.command.insert-text", { unitId: "doc-1", segmentId: "", body: { dataStream: "/5" }, range: { startOffset: 12, endOffset: 12, collapsed: true } }],
    ]);
  });
});
