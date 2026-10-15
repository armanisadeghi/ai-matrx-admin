import { SHEET_THEMES, applyThemeToSheet, columnStats, describeColumnStats } from "../chrome/sheet-extras";

describe("Column stats", () => {
  it("counts filled, blank, unique and the most common values per column", () => {
    const [a, b] = columnStats([
      ["x", 1],
      ["x", 2],
      ["y", ""],
      [null, 4],
    ]);
    expect(a).toMatchObject({ filled: 3, blank: 1, unique: 2, numeric: 0, sum: null });
    expect(a!.top[0]).toEqual({ value: "x", count: 2 });
    expect(b).toMatchObject({ filled: 3, blank: 1, numeric: 3, sum: 7, min: 1, max: 4 });
    expect(b!.mean).toBeCloseTo(7 / 3);
  });
  it("describes each column with its header", () => {
    const text = describeColumnStats(columnStats([["a"], ["a"], ["b"]]), ["Name"]);
    expect(text).toContain("Name: 3 filled, 0 blank, 2 unique");
    expect(text).toContain("a (2)");
  });
});

describe("Theme", () => {
  it("styles the whole sheet, bands alternate rows and the header row is bold on the theme colour", () => {
    const calls: string[] = [];
    const range = (r: number, c: number, nr: number, nc: number) => {
      const tag = `${r},${c},${nr},${nc}`;
      return {
        setFontFamily: (f: string | null) => calls.push(`${tag} font ${f}`),
        setFontColor: (f: string | null) => calls.push(`${tag} color ${f}`),
        setBackground: (f: string) => calls.push(`${tag} bg ${f}`),
        setFontWeight: (f: string | null) => calls.push(`${tag} weight ${f}`),
      };
    };
    const modern = SHEET_THEMES.find((t) => t.id === "modern")!;
    expect(applyThemeToSheet(modern, range, 4, 3)).toBe(12);
    expect(calls).toContain("0,0,4,3 font Roboto");
    expect(calls).toContain("2,0,1,3 bg #e8f0fe");
    expect(calls).toContain("0,0,1,3 bg #1a73e8");
    expect(calls).toContain("0,0,1,3 weight bold");
  });
  it("does nothing on an empty sheet", () => {
    expect(applyThemeToSheet(SHEET_THEMES[0]!, () => { throw new Error("no"); }, 0, 0)).toBe(0);
  });
});
