/**
 * What a person builds in a workbook must survive Excel and come back:
 * values, formulas, merges, styles, number formats, widths, heights, frozen
 * panes, validation, conditional formatting, the filter range, notes, links.
 * Drives the real converters (ExcelJS under the hood), no stand-ins; what
 * cannot be carried must be NAMED in the export report.
 */
jest.mock("@univerjs/core", () => ({
  CellValueType: { STRING: 1, NUMBER: 2, BOOLEAN: 3, FORCE_STRING: 4 },
}));
jest.mock("@univerjs/presets", () => ({ LocaleType: { EN_US: "enUS" } }));

import { buildXlsxFromUniver } from "@/features/workbooks/univer-to-xlsx";
import { xlsxToUniverWorkbook } from "@/features/workbooks/xlsx-to-univer";
import { RESOURCE, readResource, writeResource, type UniverResource } from "@/features/workbooks/xlsx-shared";

const range = (r: number, c: number, r2 = r, c2 = c) => ({ startRow: r, endRow: r2, startColumn: c, endColumn: c2 });

function build() {
  const resources: UniverResource[] = [];
  writeResource(resources, RESOURCE.validation, {
    s1: [
      { uid: "v1", type: "list", formula1: "Open,Won,Lost", formula2: "", ranges: [range(1, 1, 4, 1)], allowBlank: true, showDropDown: true },
      { uid: "v2", type: "whole", operator: "between", formula1: "1", formula2: "9", ranges: [range(1, 2, 4, 2)] },
    ],
  });
  writeResource(resources, RESOURCE.conditional, {
    s1: [
      { cfId: "c1", stopIfTrue: false, ranges: [range(1, 2, 4, 2)], rule: { type: "highlightCell", subType: "number", operator: "greaterThan", value: 200, style: { bg: { rgb: "#ffd6d6" }, cl: { rgb: "#990000" } } } },
    ],
  });
  writeResource(resources, RESOURCE.filter, { s1: { ref: range(0, 0, 4, 2), filterColumns: [] } });
  writeResource(resources, RESOURCE.note, { s1: { 0: { 0: { id: "n", row: 0, col: 0, width: 160, height: 72, note: "Quarterly" } } } });
  return {
    id: "wb",
    sheetOrder: ["s1"],
    styles: {
      head: { bl: 1, fs: 12, ff: "Arial", bg: { rgb: "#dddddd" }, cl: { rgb: "#112233" }, ht: 2, bd: { b: { s: 1, cl: { rgb: "#000000" } } } },
      money: { n: { pattern: "$#,##0.00" } },
    },
    sheets: {
      s1: {
        id: "s1",
        name: "Budget",
        cellData: {
          0: { 0: { v: "Region", t: 1, s: "head" }, 1: { v: "Status", t: 1, s: "head" }, 2: { v: "Revenue", t: 1, s: "head" } },
          1: { 0: { v: "West", t: 1 }, 1: { v: "Open", t: 1 }, 2: { v: 120, t: 2, s: "money" } },
          2: { 0: { v: "East", t: 1 }, 1: { v: "Won", t: 1 }, 2: { v: 340, t: 2, s: "money" } },
          5: { 2: { v: 460, t: 2, f: "=SUM(C2:C3)" } },
        },
        mergeData: [range(7, 0, 7, 2)],
        columnData: { 0: { w: 140 } },
        rowData: { 0: { h: 30 } },
        freeze: { xSplit: 1, ySplit: 1, startRow: 1, startColumn: 1 },
      },
    },
    resources,
  } as never;
}

describe("xlsx round trip", () => {
  it("brings back everything the file can hold, and names what it cannot", async () => {
    const { bytes, report } = await buildXlsxFromUniver(build());
    const file = new File([bytes as BlobPart], "budget.xlsx");
    Object.assign(file, {
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    const back = await xlsxToUniverWorkbook(file);
    const sheet = Object.values(back.sheets ?? {})[0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const styles = back.styles as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const resources = (back.resources ?? []) as UniverResource[];

    expect(sheet.mergeData).toEqual([range(7, 0, 7, 2)]);
    expect(sheet.cellData[1][2].v).toBe(120);
    expect(sheet.cellData[5][2].f).toBe("=SUM(C2:C3)");
    expect(styles[sheet.cellData[0][0].s]).toMatchObject({ bl: 1, fs: 12, ff: "Arial", ht: 2, bg: { rgb: "#dddddd" }, cl: { rgb: "#112233" } });
    expect(styles[sheet.cellData[1][2].s].n.pattern).toBe("$#,##0.00");
    expect(Math.abs(sheet.columnData[0].w - 140)).toBeLessThanOrEqual(4);
    expect(Math.abs(sheet.rowData[0].h - 30)).toBeLessThanOrEqual(2);
    expect(sheet.freeze).toMatchObject({ xSplit: 1, ySplit: 1 });

    const dv = Object.values(readResource<Record<string, any[]>>(resources, RESOURCE.validation) ?? {})[0] ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(dv.find((r) => r.type === "list")).toMatchObject({ formula1: "Open,Won,Lost", ranges: [range(1, 1, 4, 1)] });
    expect(dv.find((r) => r.type === "whole")).toMatchObject({ operator: "between", formula1: "1", formula2: "9" });
    const cf = Object.values(readResource<Record<string, any[]>>(resources, RESOURCE.conditional) ?? {})[0] ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(cf[0].rule).toMatchObject({ subType: "number", operator: "greaterThan", value: 200 });
    expect(cf[0].rule.style.bg.rgb).toBe("#ffd6d6");
    const filter = Object.values(readResource<Record<string, any>>(resources, RESOURCE.filter) ?? {})[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(filter.ref).toEqual(range(0, 0, 4, 2));
    const note = Object.values(readResource<Record<string, any>>(resources, RESOURCE.note) ?? {})[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(note[0][0].note).toBe("Quarterly");
    expect(report.dropped).toEqual([]);
  });

  it("says so when something cannot be written", async () => {
    const snap = build() as { resources: UniverResource[] };
    writeResource(snap.resources, RESOURCE.table, { s1: { t1: { name: "T1" } } });
    const { report } = await buildXlsxFromUniver(snap as never);
    expect(report.dropped.join(" ")).toMatch(/Tables/);
  });
});
