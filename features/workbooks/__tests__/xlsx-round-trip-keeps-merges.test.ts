/**
 * An .xlsx with merged cells must come in with its merges and go out with them.
 * Drives the real converters (SheetJS under the hood), no stand-ins.
 */
// Univer ships ESM-only; the converters need just these two enums.
jest.mock("@univerjs/core", () => ({
  CellValueType: { STRING: 1, NUMBER: 2, BOOLEAN: 3, FORCE_STRING: 4 },
}));
jest.mock("@univerjs/presets", () => ({ LocaleType: { EN_US: "enUS" } }));

import { univerSnapshotToXlsxBytes } from "@/features/workbooks/univer-to-xlsx";
import { xlsxToUniverWorkbook } from "@/features/workbooks/xlsx-to-univer";

const merge = { startRow: 0, endRow: 0, startColumn: 0, endColumn: 2 };

describe("xlsx round trip", () => {
  it("keeps merged ranges in both directions", async () => {
    const bytes = await univerSnapshotToXlsxBytes({
      sheetOrder: ["s1"],
      sheets: {
        s1: {
          id: "s1",
          name: "Budget",
          cellData: { 0: { 0: { v: "Q4", t: 1 } }, 1: { 0: { v: 5, t: 2 } } },
          mergeData: [merge],
        },
      },
    } as never);
    const file = new File([bytes as BlobPart], "budget.xlsx");
    // jsdom's File has no arrayBuffer(); the reader needs it.
    Object.assign(file, {
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    const back = await xlsxToUniverWorkbook(file);
    const sheet = Object.values(back.sheets ?? {})[0];
    expect(sheet?.mergeData).toEqual([merge]);
    expect(sheet?.cellData?.[1]?.[0]?.v).toBe(5);
  });
});
