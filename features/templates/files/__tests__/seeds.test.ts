/**
 * Every featured template is real: the content a person sees, rendered into
 * its thumbnail; the add-ons a sheet promises are actually in its snapshot.
 */
import { workbookSeeds } from "../seeds/workbook-templates";
import { documentSeeds } from "../seeds/document-templates";
import { snapshotPreviewSvg } from "../thumbnail/snapshot-preview-svg";
import { TEMPLATE_CATEGORIES } from "../types";

const sheets = workbookSeeds();
const docs = documentSeeds();

type Wb = { sheetOrder: string[]; sheets: Record<string, { cellData: Record<number, Record<number, { v?: unknown; f?: string }>> }>; resources: Array<{ name: string; data: string }> };

describe("featured templates", () => {
  it("12 sheets and 12 docs, unique keys, known categories, no filler", () => {
    expect(sheets).toHaveLength(12);
    expect(docs).toHaveLength(12);
    const all = [...sheets, ...docs];
    expect(new Set(all.map((t) => t.seedKey)).size).toBe(all.length);
    for (const t of all) {
      expect(TEMPLATE_CATEGORIES as readonly string[]).toContain(t.category);
      expect(JSON.stringify(t.snapshot)).not.toMatch(/lorem|ipsum|acme|\bfoo\b/i);
    }
  });

  it.each(sheets.map((t) => [t.name, t] as const))("sheet %s carries its add-ons and every formula has a value", (_n, t) => {
    const wb = t.snapshot as unknown as Wb;
    const res = Object.fromEntries(wb.resources.map((r) => [r.name, JSON.parse(r.data)]));
    expect(Object.keys(res)).toEqual(expect.arrayContaining(["SHEET_DATA_VALIDATION_PLUGIN", "SHEET_CONDITIONAL_FORMATTING_PLUGIN", "SHEET_FILTER_PLUGIN"]));
    const cells = Object.values(wb.sheets[wb.sheetOrder[0]].cellData).flatMap((r) => Object.values(r));
    for (const c of cells.filter((c) => c.f)) expect(c.v).not.toBeUndefined();
    expect(cells.filter((c) => typeof c.v === "string" && c.v.length > 2).length).toBeGreaterThan(5);
  });

  it("the sheets use dropdowns, checkboxes, conditional formats, filters and formulas", () => {
    const flat = sheets.map((t) => JSON.stringify(t.snapshot)).join("\n");
    expect(flat).toContain('\\"type\\":\\"list\\"');
    expect(flat).toContain('\\"type\\":\\"checkbox\\"');
    expect(flat).toContain("highlightCell");
    expect(flat).toContain("filterColumns");
    expect(flat).toContain('"f":"=SUM(');
  });

  it.each([...sheets, ...docs].map((t) => [t.name, t] as const))("%s renders a thumbnail showing its own words", (_n, t) => {
    const svg = snapshotPreviewSvg(t.kind, t.snapshot);
    expect(svg.length).toBeGreaterThan(1500);
    const words = (svg.match(/>([^<]{3,})</g) ?? []).length;
    expect(words).toBeGreaterThan(8);
  });

  it("documents carry real tables and styled headings", () => {
    const withTables = docs.filter((d) => JSON.stringify(d.snapshot).includes('"tableSource"'));
    expect(withTables.length).toBeGreaterThanOrEqual(7);
    // Every document but the personal letter opens with a coloured heading.
    const headed = docs.filter((d) =>
      (d.snapshot as { body: { textRuns: Array<{ ts: { fs?: number; cl?: unknown } }> } }).body.textRuns.some(
        (r) => (r.ts.fs ?? 0) >= 13 && r.ts.cl,
      ),
    );
    expect(headed.map((d) => d.seedKey).sort()).toEqual(docs.map((d) => d.seedKey).filter((k) => k !== "doc-letter").sort());
  });
});
