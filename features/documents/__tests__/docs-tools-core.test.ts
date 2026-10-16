/** The Docs tools' pure logic: building blocks insert mid-document, bookmarks are found/named/de-duplicated, borders write both sides, the ruler lines up with the page. */
import {
  BUILDING_BLOCKS, BOOKMARK_ANCHOR, bookmarkBody, bookmarkFromHash, bookmarkHash, cleanBookmarkName, collectBookmarks,
  insertableBody, paragraphBorderParams, readDocumentLanguage, rulerGeometry,
} from "../doc-tools-core";

describe("building blocks", () => {
  it.each(BUILDING_BLOCKS.map((b) => [b.id, b] as const))("%s becomes an insertable body with no document end", (_id, block) => {
    const body = insertableBody(block.markdown);
    expect(body.dataStream.length).toBeGreaterThan(20);
    expect(body.dataStream.endsWith("\n")).toBe(false);
    expect(body.dataStream.endsWith("\r")).toBe(true);
    expect(body.paragraphs.length).toBeGreaterThan(2);
    for (const p of body.paragraphs) expect(p.startIndex).toBeLessThan(body.dataStream.length);
    for (const r of body.textRuns ?? []) expect(r.ed).toBeLessThanOrEqual(body.dataStream.length);
  });
  it("a building block's markdown headings insert as real heading paragraphs, not plain text", () => {
    const pros = BUILDING_BLOCKS.find((b) => b.id === "pros-cons")!;
    const body = insertableBody(pros.markdown);
    expect(body.dataStream).not.toContain("#");
    const styleAt = (text: string) => {
      const at = body.dataStream.indexOf(text) + text.length;
      return body.paragraphs.find((p) => p.startIndex === at)?.paragraphStyle?.namedStyleType;
    };
    expect(styleAt("Pros and cons")).toBe(5); // HEADING_2
    expect(styleAt("Verdict")).toBe(6); // HEADING_3
  });
  it("the heading text is in the stream", () => {
    expect(insertableBody(BUILDING_BLOCKS[0]!.markdown).dataStream).toContain("Meeting notes");
  });
});

describe("bookmarks", () => {
  const snap = { body: { dataStream: "ab​cd​\r\n", customRanges: [
    { rangeId: "b2", rangeType: 3, startIndex: 5, properties: { name: "Later" } },
    { rangeId: "b1", rangeType: 3, startIndex: 2, properties: { name: "Intro" } },
    { rangeId: "h", rangeType: 0, startIndex: 0, properties: {} },
  ] } };
  it("finds only bookmarks, in document order", () => {
    expect(collectBookmarks(snap)).toEqual([{ id: "b1", name: "Intro", offset: 2 }, { id: "b2", name: "Later", offset: 5 }]);
  });
  it("a bookmark body is one zero-width anchor with a BOOKMARK range carrying its name", () => {
    const b = bookmarkBody("x", "Intro");
    expect(b.dataStream).toBe(BOOKMARK_ANCHOR);
    expect(b.customRanges[0]).toMatchObject({ rangeType: 3, rangeId: "x", properties: { name: "Intro" } });
  });
  it("refuses empty and duplicate names, tidies spaces", () => {
    const have = collectBookmarks(snap);
    expect(cleanBookmarkName("   ", have)).toMatchObject({ ok: false });
    expect(cleanBookmarkName("intro", have)).toMatchObject({ ok: false });
    expect(cleanBookmarkName("  New   spot ", have)).toEqual({ ok: true, name: "New spot" });
  });
  it("the page address round-trips a name", () => {
    expect(bookmarkFromHash(bookmarkHash("Q3 plan & risks"))).toBe("Q3 plan & risks");
    expect(bookmarkFromHash("#other")).toBeNull();
  });
});

describe("borders", () => {
  const base = { color: "#000000", width: 1, dash: "solid" as const, padding: 4 };
  it("both writes top and bottom; none clears both", () => {
    expect(paragraphBorderParams({ ...base, side: "both" })).toMatchObject({ borderTop: { width: 1, dashStyle: 1 }, borderBottom: { width: 1, padding: 4 } });
    expect(paragraphBorderParams({ ...base, side: "none" })).toEqual({ borderTop: null, borderBottom: null });
    expect(paragraphBorderParams({ ...base, side: "top", dash: "dashed" })).toMatchObject({ borderTop: { dashStyle: 3 }, borderBottom: null });
  });
});

describe("ruler", () => {
  it("puts the zero inch at the left margin and a tick every eighth", () => {
    const g = rulerGeometry({ containerWidth: 1000, zoom: 1, pageWidthPx: 816, marginLeftPx: 96, marginRightPx: 96 });
    expect(g.pageLeft).toBeCloseTo(92);
    expect(g.marginLeft).toBe(96);
    const inches = g.ticks.filter((t) => t.kind === "inch");
    expect(inches.map((t) => t.x)).toEqual([92, 188, 284, 380, 476, 572, 668, 764, 860]);
    expect(inches.find((t) => t.x === 188)?.label).toBeUndefined();
    expect(inches.find((t) => t.x === 284)?.label).toBe("1");
  });
  it("zooming scales the page and the margins together", () => {
    const g = rulerGeometry({ containerWidth: 1000, zoom: 0.5, pageWidthPx: 816, marginLeftPx: 96, marginRightPx: 96 });
    expect(g.pageWidth).toBe(408);
    expect(g.marginLeft).toBe(48);
  });
});

describe("language", () => {
  it("reads a known code and falls back to US English", () => {
    expect(readDocumentLanguage({ matrxLanguage: "fr" })).toBe("fr");
    expect(readDocumentLanguage({ matrxLanguage: "xx" })).toBe("en-US");
    expect(readDocumentLanguage(undefined)).toBe("en-US");
  });
});
