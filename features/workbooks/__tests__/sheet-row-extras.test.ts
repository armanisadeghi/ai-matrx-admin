/**
 * The Sheets rows that left "Coming soon" in round two, checked on their logic: settings, data extraction,
 * timeline, named functions, CSV, filter views, saved extras on the workbook, and the painted View → Show modes.
 */
import {
  applyFilterView,
  buildTimeline,
  captureFilterView,
  cellAsDay,
  csvCell,
  extractFields,
  lambdaFormula,
  namedFunctionNameProblem,
  namedFunctionsFrom,
  normalizePrefs,
  normalizeSettings,
  parseCsv,
  protectPanelTitle,
  recalcIntervalMs,
  type FilterSheetLike,
} from "../chrome/sheet-row-extras";
import { extraFromMetadata, withExtra } from "../sheet-extras-service";
import { isCellProtected, paintedCell } from "../chrome/sheet-view-overlays";

describe("spreadsheet settings", () => {
  it("keeps what is valid and falls back per field for what is not", () => {
    expect(normalizeSettings({ locale: "de-DE", timeZone: "Asia/Tokyo", recalculation: "on-change-and-hour" })).toEqual({ locale: "de-DE", timeZone: "Asia/Tokyo", recalculation: "on-change-and-hour" });
    const bad = normalizeSettings({ locale: "nope!!", timeZone: "Mars/Base", recalculation: "sometimes" });
    expect(bad.locale).toBe("en-US");
    expect(bad.recalculation).toBe("on-change");
    expect(bad.timeZone).not.toBe("Mars/Base");
  });
  it("turns the calculation choice into a timer", () => {
    expect(recalcIntervalMs("on-change")).toBeNull();
    expect(recalcIntervalMs("on-change-and-minute")).toBe(60_000);
    expect(recalcIntervalMs("on-change-and-hour")).toBe(3_600_000);
  });
  it("defaults every Tools preference on, each independent of the others", () => {
    expect(normalizePrefs(undefined)).toEqual({ functionSuggestions: true, formulaHints: true, columnAutocomplete: true });
    expect(normalizePrefs({ columnAutocomplete: false })).toEqual({ functionSuggestions: true, formulaHints: true, columnAutocomplete: false });
    expect(normalizePrefs({ autocomplete: false })).toMatchObject({ functionSuggestions: false, columnAutocomplete: true });
  });
});

describe("saved extras live beside every other metadata key", () => {
  it("replaces one extra and keeps the rest", () => {
    const meta = { page_setup: { paper: "a4" }, table_links: [1], sheet_extras: { macros: ["m"], prefs: { autocomplete: false } } };
    const next = withExtra(meta, "settings", { locale: "fr-FR" });
    expect(next.page_setup).toEqual({ paper: "a4" });
    expect(next.table_links).toEqual([1]);
    expect(extraFromMetadata(next, "macros")).toEqual(["m"]);
    expect(extraFromMetadata(next, "settings")).toEqual({ locale: "fr-FR" });
    expect(extraFromMetadata(null, "settings")).toBeUndefined();
    expect(withExtra(null, "prefs", 1)).toEqual({ sheet_extras: { prefs: 1 } });
  });
});

describe("data extraction", () => {
  const cells = ["Mail jo@x.org or ann@y.com, see https://a.io/p?x=1 now", "call (415) 555-0199 for $1,250.50", "nothing here", null];
  it("pulls each kind into its own column and counts the rows that had something", () => {
    const out = extractFields(cells, ["email", "url", "phone", "amount"]);
    expect(out.headers).toEqual(["Email addresses", "Web links", "Phone numbers", "Amounts of money"]);
    expect(out.rows[0]).toEqual(["jo@x.org, ann@y.com", "https://a.io/p?x=1", "", ""]);
    expect(out.rows[1]).toEqual(["", "", "(415) 555-0199", "$1,250.50"]);
    expect(out.rows[2]).toEqual(["", "", "", ""]);
    expect(out.matched).toBe(2);
  });
  it("finds dates, hashtags and mentions without treating an email's @ as a mention", () => {
    const out = extractFields(["due 2026-10-15 and 3/4/2027 #launch @ann write ann@y.com"], ["date", "hashtag", "mention"]);
    expect(out.rows[0]).toEqual(["2026-10-15, 3/4/2027", "#launch", "@ann"]);
  });
});

describe("timeline", () => {
  const rows = [
    ["Task", "Due", "Owner"],
    ["Ship", "11/3/2026", "Ann"],
    ["Plan", "2026-10-02", "Bo"],
    ["Review", 46325, "Cy"], // Excel serial for 2026-10-30
    ["Idea", "someday", "Di"],
  ];
  it("reads Excel serials, ISO and m/d/yyyy, orders by day and groups by month", () => {
    expect(cellAsDay(46325)).toBe("2026-10-30");
    expect(cellAsDay("11/3/2026")).toBe("2026-11-03");
    expect(cellAsDay("13/40/2026")).toBeNull();
    const t = buildTimeline(rows)!;
    expect(t.dateColumn).toBe(1);
    expect(t.titleColumn).toBe(0);
    expect(t.items.map((i) => i.title)).toEqual(["Plan", "Review", "Ship"]);
    expect(t.months.map((m) => m.month)).toEqual(["October 2026", "November 2026"]);
  });
  it("says nothing when no column reads as dates", () => {
    expect(buildTimeline([["a", "b"], ["c", "d"]])).toBeNull();
  });
});

describe("named functions", () => {
  it("builds the LAMBDA the engine runs and reads it back", () => {
    expect(lambdaFormula(["x", " y "], "=x*y")).toBe("=LAMBDA(x, y, x*y)");
    expect(namedFunctionsFrom([{ name: "AREA", formula: "=LAMBDA(w, h, IF(w>0, w*h, 0))" }, { name: "TaxRate", formula: "Sheet1!$A$1" }])).toEqual([
      { name: "AREA", args: ["w", "h"], body: "IF(w>0, w*h, 0)" },
    ]);
  });
  it("refuses names that cannot work", () => {
    expect(namedFunctionNameProblem("", [])).not.toBeNull();
    expect(namedFunctionNameProblem("2fast", [])).not.toBeNull();
    expect(namedFunctionNameProblem("A1", [])).not.toBeNull();
    expect(namedFunctionNameProblem("area", ["AREA"])).not.toBeNull();
    expect(namedFunctionNameProblem("DOUBLE_IT", [])).toBeNull();
  });
});

describe("csv", () => {
  it("handles quotes, doubled quotes, CRLF and numbers", () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n3,4.5\r\n');
    expect(rows).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["3", "4.5"]]);
    expect(rows[2]!.map(csvCell)).toEqual([3, 4.5]);
    expect(csvCell("007a")).toBe("007a");
  });
  it("reads tab and semicolon files through the same one reader", () => {
    expect(parseCsv("a\tb\tc\n1\t2\t3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
  it("reads a quoted header and a leading BOM", () => {
    expect(parseCsv('\uFEFF"total_bill","tip"\n16.99,1.01\n')).toEqual([["total_bill", "tip"], ["16.99", "1.01"]]);
  });
});

describe("filter views", () => {
  function fakeSheet() {
    const set: { col: number; crit: unknown }[] = [];
    let removed = 0;
    let created: unknown[] | null = null;
    const criteria: Record<number, { filters?: { filters?: string[]; blank?: true } }> = { 1: { filters: { filters: ["open"] } }, 2: { filters: { filters: [], blank: true } } };
    const filter = {
      getRange: () => ({ getRange: () => ({ startRow: 0, endRow: 9, startColumn: 0, endColumn: 2 }) }),
      getColumnFilterCriteria: (c: number) => criteria[c] ?? null,
      setColumnFilterCriteria: (col: number, crit: unknown) => void set.push({ col, crit }),
      remove: () => void (removed += 1),
    };
    let has = true;
    const sheet: FilterSheetLike = {
      getSheetId: () => "s1",
      getFilter: () => (has ? filter : null),
      getRange: (...a: number[]) => ({ createFilter: () => ((created = a), has = true, filter) }),
    };
    return { sheet, set, get removed() { return removed; }, get created() { return created; }, drop: () => (has = false) };
  }
  it("captures the range and each filtered column, and puts them back", () => {
    const f = fakeSheet();
    const view = captureFilterView(f.sheet, "Open only", "v1")!;
    expect(view.columns).toEqual([{ column: 1, values: ["open"], blank: false }, { column: 2, values: [], blank: true }]);
    expect(view.range).toEqual({ startRow: 0, endRow: 9, startColumn: 0, endColumn: 2 });
    expect(applyFilterView(f.sheet, view)).toBe(true);
    expect(f.removed).toBe(1);
    expect(f.created).toEqual([0, 0, 10, 3]);
    expect(f.set.map((s) => s.col)).toEqual([1, 2]);
  });
  it("has nothing to capture without a filter", () => {
    const f = fakeSheet();
    f.drop();
    expect(captureFilterView(f.sheet, "x", "v")).toBeNull();
  });
});

describe("View → Show paints, never edits", () => {
  const state = (formulas: boolean, protectedRanges: boolean) => ({ formulas, protectedRanges });
  it("shows the formula text instead of the value, only while Formulas is on", () => {
    const cell = { v: 42, t: 2 };
    expect(paintedCell(cell, "=SUM(A1:A3)", false, state(true, false), null)).toMatchObject({ v: "=SUM(A1:A3)", t: 1 });
    expect(paintedCell(cell, "=SUM(A1:A3)", false, state(false, false), null)).toBe(cell);
    expect(paintedCell(cell, null, false, state(true, false), null)).toBe(cell);
    expect(cell).toEqual({ v: 42, t: 2 });
  });
  it("shades protected cells and keeps their own style", () => {
    const out = paintedCell({ v: 1 }, null, true, state(false, true), { bl: 1 }) as { s: { bl: number; bg: { rgb: string } } };
    expect(out.s.bl).toBe(1);
    expect(out.s.bg.rgb).toBe("#fde7e9");
    expect(paintedCell({ v: 1 }, null, false, state(false, true), null)).toEqual({ v: 1 });
  });
  it("knows which cells a rule covers", () => {
    const rule = [{ startRow: 1, endRow: 2, startColumn: 0, endColumn: 0 }];
    expect(isCellProtected(rule, false, 2, 0)).toBe(true);
    expect(isCellProtected(rule, false, 3, 0)).toBe(false);
    expect(isCellProtected([], true, 50, 9)).toBe(true);
  });
});

describe("Protect panel title", () => {
  it("matches what is selected, never always 'Rows and Columns'", () => {
    const at = (r: number, c: number, r2 = r, c2 = c, rangeType?: number) => ({ range: { startRow: r, endRow: r2, startColumn: c, endColumn: c2, rangeType } });
    expect(protectPanelTitle(at(1, 1))).toBe("Protect cell");
    expect(protectPanelTitle(at(1, 1, 3, 2))).toBe("Protect range");
    expect(protectPanelTitle(at(0, 2, 99, 2, 2))).toBe("Protect column");
    expect(protectPanelTitle(at(4, 0, 5, 25, 1))).toBe("Protect rows");
    expect(protectPanelTitle({ unitType: 2 })).toBe("Protect sheet");
  });
});
