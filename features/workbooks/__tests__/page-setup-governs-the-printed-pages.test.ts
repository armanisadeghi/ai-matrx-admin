/**
 * File → Page setup is real only if the printed pages obey it. Each setting is flipped and the pages
 * (the same HTML Print and the PDF draw) must change; stored values must come back whole.
 */
import {
  DEFAULT_SHEET_PAGE_SETUP,
  normalizeSheetPageSetup,
  pageSetupFromMetadata,
  planSheetPrint,
  printGeometry,
  type SheetPageSetup,
} from "../sheet-page-setup";
import { buildPrintDocument, collectPrintSheets, printDocumentHtml } from "../sheet-print-pages";

const setup = (p: Partial<SheetPageSetup> = {}): SheetPageSetup => ({ ...DEFAULT_SHEET_PAGE_SETUP, ...p });
const grid = (rows: number, cols: number) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => `r${r}c${c} value text`));

function snapshot() {
  const cells = (rows: number, cols: number) => {
    const out: Record<string, Record<string, { v: string }>> = {};
    for (let r = 0; r < rows; r += 1) {
      out[r] = {};
      for (let c = 0; c < cols; c += 1) out[r]![c] = { v: `s${rows}r${r}c${c}` };
    }
    return out;
  };
  return {
    sheetOrder: ["a", "b"],
    sheets: {
      a: { name: "Alpha", cellData: cells(6, 4), freeze: { xSplit: 1, ySplit: 2 } },
      b: { name: "Beta", cellData: cells(3, 2) },
    },
  };
}

describe("stored page setup", () => {
  it("comes back whole from the workbook's metadata", () => {
    const stored = setup({ paper: "A4", orientation: "landscape", scale: "page", margins: "custom", customMargins: { top: 1.5, bottom: 0.5, left: 0.25, right: 2 }, scope: "workbook", gridlines: false, repeatFrozenRows: true, repeatFrozenColumns: true, pageOrder: "over-down", alignH: "center", alignV: "middle" });
    expect(pageSetupFromMetadata({ table_links: [], page_setup: JSON.parse(JSON.stringify(stored)) })).toEqual(stored);
  });
  it("repairs anything broken instead of failing", () => {
    expect(normalizeSheetPageSetup({ paper: "Nope", scale: 7, scope: [], customMargins: { top: -4, left: "x" }, gridlines: "yes" })).toEqual(DEFAULT_SHEET_PAGE_SETUP);
    expect(pageSetupFromMetadata(null)).toEqual(DEFAULT_SHEET_PAGE_SETUP);
  });
});

describe("paper, orientation and margins", () => {
  it("Letter portrait is 8.5 x 11 in; landscape swaps; A4 and Legal differ", () => {
    expect(printGeometry(setup())).toMatchObject({ paperWidth: 816, paperHeight: 1056 });
    expect(printGeometry(setup({ orientation: "landscape" }))).toMatchObject({ paperWidth: 1056, paperHeight: 816 });
    expect(printGeometry(setup({ paper: "A4" })).paperWidth).toBe(794);
    expect(printGeometry(setup({ paper: "Legal" })).paperHeight).toBe(1344);
  });
  it("narrow margins give more room than normal, wide less, custom exactly what was typed", () => {
    const area = (p: Partial<SheetPageSetup>) => printGeometry(setup(p)).areaWidth;
    expect(area({ margins: "narrow" })).toBeGreaterThan(area({ margins: "normal" }));
    expect(area({ margins: "wide" })).toBeLessThan(area({ margins: "normal" }));
    expect(printGeometry(setup({ margins: "custom", customMargins: { top: 2, bottom: 1, left: 0.5, right: 0.5 } }))).toMatchObject({ marginTop: 192, marginBottom: 96, marginLeft: 48, areaWidth: 816 - 96 });
  });
  it("the printed document carries the paper size to the browser's @page and to every page", () => {
    const doc = buildPrintDocument([{ name: "S", rows: grid(3, 2), frozenRows: 0, frozenCols: 0 }], setup({ paper: "A3", orientation: "landscape" }))!;
    expect(doc.pageWidth).toBe(1587);
    expect(doc.pageHeight).toBe(1123);
    const html = printDocumentHtml(doc, "T");
    expect(html).toContain("@page{size:16.531in 11.698in");
    expect(doc.pagesHtml[0]).toContain("width:1587px;height:1123px");
  });
});

describe("scale", () => {
  const wide = grid(30, 14);
  it("normal prints at 100% and splits the wide sheet over several column pages", () => {
    const plan = planSheetPrint(wide, setup());
    expect(plan.scale).toBe(1);
    expect(new Set(plan.pages.map((p) => p.cols.join())).size).toBeGreaterThan(1);
  });
  it("fit to width shrinks until every column is on one page", () => {
    const plan = planSheetPrint(wide, setup({ scale: "width" }));
    expect(plan.scale).toBeLessThan(1);
    expect(new Set(plan.pages.map((p) => p.cols.join())).size).toBe(1);
  });
  it("fit to height keeps every row on one page; fit to page puts the whole sheet on one", () => {
    const tall = grid(120, 3);
    const h = planSheetPrint(tall, setup({ scale: "height" }));
    expect(h.scale).toBeLessThan(1);
    expect(new Set(h.pages.map((p) => p.rows.join())).size).toBe(1);
    expect(planSheetPrint(grid(120, 14), setup({ scale: "page" })).pages).toHaveLength(1);
  });
  it("the scale reaches the drawn page", () => {
    const doc = buildPrintDocument([{ name: "S", rows: wide, frozenRows: 0, frozenCols: 0 }], setup({ scale: "width" }))!;
    expect(doc.pagesHtml[0]).toMatch(/transform:scale\(0\.\d+\)/);
    const normal = buildPrintDocument([{ name: "S", rows: wide, frozenRows: 0, frozenCols: 0 }], setup())!;
    expect(normal.pagesHtml[0]).toContain("transform:scale(1)");
  });
});

describe("gridlines, repeated frozen panes, page order, alignment", () => {
  const sheet = { name: "S", rows: grid(160, 3), frozenRows: 2, frozenCols: 0 };
  it("gridlines on draw cell borders; off draws none", () => {
    expect(buildPrintDocument([sheet], setup())!.pagesHtml[0]).toContain("border:1px solid");
    expect(buildPrintDocument([sheet], setup({ gridlines: false }))!.pagesHtml[0]).not.toContain("border:1px solid");
  });
  it("repeat frozen rows puts the frozen rows at the top of every later page", () => {
    const plain = planSheetPrint(sheet.rows, setup(), { rows: 2, cols: 0 });
    expect(plain.pages.length).toBeGreaterThan(1);
    expect(plain.pages[1]!.rows[0]).toBeGreaterThan(1);
    const repeated = planSheetPrint(sheet.rows, setup({ repeatFrozenRows: true }), { rows: 2, cols: 0 });
    expect(repeated.pages[1]!.rows.slice(0, 2)).toEqual([0, 1]);
    expect(repeated.pages.length).toBeGreaterThanOrEqual(plain.pages.length);
  });
  it("repeat frozen columns puts the frozen column first on every column page", () => {
    const rows = grid(5, 14);
    const repeated = planSheetPrint(rows, setup({ repeatFrozenColumns: true }), { rows: 0, cols: 1 });
    expect(repeated.pages.length).toBeGreaterThan(1);
    for (const p of repeated.pages) expect(p.cols[0]).toBe(0);
  });
  it("page order decides whether pages run down then over, or over then down", () => {
    const rows = grid(160, 14);
    const down = planSheetPrint(rows, setup({ pageOrder: "down-over" })).pages;
    const over = planSheetPrint(rows, setup({ pageOrder: "over-down" })).pages;
    expect(down.length).toBe(over.length);
    expect(down[0]!.cols).toEqual(down[1]!.cols);
    expect(over[0]!.rows).toEqual(over[1]!.rows);
    expect(down[0]!.rows).not.toEqual(down[1]!.rows);
  });
  it("alignment reaches the page", () => {
    const html = buildPrintDocument([{ name: "S", rows: grid(2, 2), frozenRows: 0, frozenCols: 0 }], setup({ alignH: "center", alignV: "bottom" }))!.pagesHtml[0]!;
    expect(html).toContain("justify-content:center;align-items:flex-end");
    expect(buildPrintDocument([{ name: "S", rows: grid(2, 2), frozenRows: 0, frozenCols: 0 }], setup())!.pagesHtml[0]).toContain("justify-content:flex-start;align-items:flex-start");
  });
});

describe("what to print", () => {
  it("current sheet prints that sheet only; workbook prints every sheet; selected cells print the selection", () => {
    const snap = snapshot();
    expect(collectPrintSheets(snap, setup(), { sheetId: "b" }).map((s) => s.name)).toEqual(["Beta"]);
    expect(collectPrintSheets(snap, setup({ scope: "workbook" }), { sheetId: "b" }).map((s) => s.name)).toEqual(["Alpha", "Beta"]);
    const sel = collectPrintSheets(snap, setup({ scope: "selection" }), { sheetId: "a", selection: { startRow: 1, endRow: 2, startColumn: 1, endColumn: 3 } });
    expect(sel).toHaveLength(1);
    expect(sel[0]!.rows).toEqual([["s6r1c1", "s6r1c2", "s6r1c3"], ["s6r2c1", "s6r2c2", "s6r2c3"]]);
  });
  it("a single selected cell, or none, prints nothing instead of the whole sheet", () => {
    const snap = snapshot();
    expect(collectPrintSheets(snap, setup({ scope: "selection" }), { sheetId: "a", selection: null })).toEqual([]);
    expect(collectPrintSheets(snap, setup({ scope: "selection" }), { sheetId: "a", selection: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 } })).toEqual([]);
  });
  it("frozen panes are read from the sheet", () => {
    const [a] = collectPrintSheets(snapshot(), setup(), { sheetId: "a" });
    expect([a!.frozenRows, a!.frozenCols]).toEqual([2, 1]);
  });
});
