
import { CsvLinkError, csvLinkMessage, readCsvLink, writeRowsGrowing, type GrowableSheet } from "@/features/workbooks/chrome/sheet-csv-link";

const tips = ['"total_bill","tip","sex","smoker","day","time","size"', ...Array.from({ length: 244 }, (_, i) => `${10 + i}.5,1.0,"Female","No","Sun","Dinner",2`)].join("\n");

/** A sheet that behaves like Univer's: a write past the last row throws. */
function strictSheet(rows: number, cols: number) {
  const state = { rows, cols, cells: new Map<string, unknown>() };
  const sheet: GrowableSheet = {
    getMaxRows: () => state.rows,
    getMaxColumns: () => state.cols,
    setRowCount: (n) => void (state.rows = n),
    setColumnCount: (n) => void (state.cols = n),
    getRange: (r, c, h, w) => ({
      setValues: (v) => {
        if (r + h > state.rows || c + w > state.cols) throw new Error("range out of bounds");
        v.forEach((row, i) => row.forEach((x, j) => state.cells.set(`${r + i},${c + j}`, x)));
      },
    }),
  };
  return { state, sheet };
}

describe("CSV from a link", () => {
  it("a 245-row file lands in a 100-row sheet (the sheet grows)", async () => {
    const rows = await readCsvLink("https://x.test/tips.csv", async () => ({ data: { text: tips } }));
    expect(rows).toHaveLength(245);
    const { state, sheet } = strictSheet(100, 26);
    expect(writeRowsGrowing(sheet, 9, 0, rows)).toBe(245);
    expect(state.rows).toBeGreaterThanOrEqual(254);
    expect(state.cells.get("9,0")).toBe("total_bill");
    expect(state.cells.get("10,0")).toBe(10.5);
  });
  it("names the step that failed instead of the generic words", async () => {
    const refused = Object.assign(new Error("x"), { details: { detail: { message: "That address cannot be fetched." } } });
    await expect(readCsvLink("http://10.0.0.1/a.csv", async () => Promise.reject(refused))).rejects.toThrow("That address cannot be fetched.");
    const fixed = { getMaxRows: () => 10, getMaxColumns: () => 5, getRange: () => ({ setValues: () => { throw new Error("boom"); } }) } as GrowableSheet;
    expect(() => writeRowsGrowing(fixed, 0, 0, [["a"]])).toThrow("could not hold it");
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(csvLinkMessage(new CsvLinkError("The file has no rows in it."))).toBe("The file has no rows in it.");
  });
});
