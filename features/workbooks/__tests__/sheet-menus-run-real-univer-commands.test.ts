/**
 * The workbook's Google-Sheets menus and toolbar run REAL Univer commands.
 *
 * - Every command id a row sends exists in the installed Univer 1.0.4 bundles
 *   (a typo or a Pro-only id fails here, not silently in a person's hands).
 * - No row is a no-op: running it reaches the editor (a command, a facade call
 *   or a host toggle).
 * - The rows Arman named do what they say: Freeze 1 row, number formats,
 *   gridlines, zoom, checkbox, trim whitespace, remove duplicates.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  buildSheetMenus,
  buildSheetToolbar,
  removeDuplicateRows,
  trimWhitespace,
  type RangeLike,
  type SheetChromeHost,
  type WorksheetLike,
} from "../chrome/sheet-commands";
import { flattenMenus, type EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";

// "Custom number format" asks in our own dialog; the test answers it.
jest.mock("@/components/dialogs/value-prompts/valuePromptsOpener", () => ({
  promptForValues: async () => ({ pattern: "0.0%" }),
}));

type Call = { kind: string; args: unknown[] };

function fakeHost(values: unknown[][] = [["a"]], formulas: string[][] = [[""]]) {
  const calls: Call[] = [];
  const rec = (kind: string) => (...args: unknown[]) => {
    calls.push({ kind, args });
    return undefined;
  };
  const range: RangeLike = {
    setNumberFormat: rec("range.setNumberFormat"),
    getRange: () => ({ startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 }),
    getValues: () => values,
    getFormulas: () => formulas,
    setValues: rec("range.setValues"),
    getCellStyleData: () => ({ bl: 1 }),
    isMerged: () => false,
    useThemeStyle: rec("range.useThemeStyle"),
    removeThemeStyle: rec("range.removeThemeStyle"),
    getUsedThemeStyle: () => undefined,
    setDataValidation: rec("range.setDataValidation"),
  };
  let frozenRows = 0;
  const sheet: WorksheetLike = {
    getSheetId: () => "s1",
    setFrozenRows: (n: number) => {
      frozenRows = n;
      calls.push({ kind: "sheet.setFrozenRows", args: [n] });
    },
    setFrozenColumns: rec("sheet.setFrozenColumns"),
    getFrozenRows: () => frozenRows,
    getFrozenColumns: () => 0,
    setHiddenGridlines: rec("sheet.setHiddenGridlines"),
    hasHiddenGridLines: () => false,
    zoom: rec("sheet.zoom"),
    getZoom: () => 1,
    getSelection: () => ({ getActiveRange: () => range }),
  };
  const host: SheetChromeHost = {
    api: {
      executeCommand: (id: string, params?: object) => {
        calls.push({ kind: "exec", args: params ? [id, params] : [id] });
        return true;
      },
      getActiveWorkbook: () => ({ getActiveSheet: () => sheet }),
      newDataValidation: () => ({
        requireCheckbox: () => ({ build: () => "checkbox-rule" }),
        requireValueInList: (v: string[]) => ({ build: () => `list:${v.join("|")}` }),
      }),
    },
    editable: true,
    print: rec("host.print"),
    formulaBarVisible: () => true,
    toggleFormulaBar: rec("host.toggleFormulaBar"),
    fullScreen: () => false,
    toggleFullScreen: rec("host.toggleFullScreen"),
    notify: rec("host.notify"),
  };
  return { host, calls };
}

/** Every `"x.command.y"` / `"x.operation.y"` string in the installed Univer bundles. */
function univerCommandIds(): Set<string> {
  const pnpm = join(__dirname, "..", "..", "..", "node_modules", ".pnpm");
  const ids = new Set<string>();
  for (const dir of readdirSync(pnpm)) {
    if (!dir.startsWith("@univerjs+")) continue;
    const name = dir.slice("@univerjs+".length).split("@")[0]!;
    const file = join(pnpm, dir, "node_modules", "@univerjs", name, "lib", "es", "index.js");
    if (!existsSync(file)) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/"([a-z-]+\.(?:command|operation)\.[A-Za-z0-9.-]+)"/g)) ids.add(m[1]!);
  }
  return ids;
}

function allRunnables(host: SheetChromeHost) {
  const menus = buildSheetMenus(host);
  const toolbar = buildSheetToolbar(host);
  const fromToolbarMenus = toolbar.flatMap((t) =>
    t.kind === "menu" ? flattenMenus([{ id: t.id, label: t.label, items: t.items as EditorMenuEntry[] }]) : [],
  );
  const buttons = toolbar.flatMap((t) => (t.kind === "button" ? [{ id: t.id, run: t.run }] : []));
  return [...flattenMenus(menus), ...fromToolbarMenus, ...buttons];
}

describe("workbook menus and toolbar → Univer", () => {
  it("every command id sent exists in the installed Univer bundles", () => {
    const known = univerCommandIds();
    expect(known.size).toBeGreaterThan(200); // the scan itself works
    const { host, calls } = fakeHost();
    for (const a of allRunnables(host)) void a.run();
    const sent = [...new Set(calls.filter((c) => c.kind === "exec").map((c) => c.args[0] as string))];
    expect(sent.length).toBeGreaterThan(60);
    const unknown = sent.filter((id) => !known.has(id));
    expect(unknown).toEqual([]);
  });

  it("no row is a no-op", async () => {
    for (const a of allRunnables(fakeHost().host)) {
      const { host, calls } = fakeHost([["  x  "], ["  x  "]], [[""], [""]]);
      const same = allRunnables(host).find((r) => r.id === a.id)!;
      await same.run();
      expect({ id: a.id, reached: calls.length > 0 }).toEqual({ id: a.id, reached: true });
    }
  });

  // Univer's panel operations return false (nothing opens) without their params: the conditional
  // formatting panel switches on `value`, the validation panel needs an object. Found live 2026-10-12.
  it("panel rows send the params Univer's panel operations require", () => {
    const { host, calls } = fakeHost();
    const rows = flattenMenus(buildSheetMenus(host));
    void rows.find((r) => r.id === "format.conditional")!.run();
    void rows.find((r) => r.id === "data.validation")!.run();
    const exec = calls.filter((c) => c.kind === "exec");
    expect(exec.find((c) => c.args[0] === "sheet.operation.open.conditional.formatting.panel")?.args[1]).toEqual({ value: 1 });
    expect(typeof exec.find((c) => c.args[0] === "data-validation.operation.open-validation-panel")?.args[1]).toBe("object");
  });

  it("the named Google rows do what they say", () => {
    const { host, calls } = fakeHost();
    const rows = flattenMenus(buildSheetMenus(host));
    const runId = (id: string) => void rows.find((r) => r.id === id)!.run();

    runId("view.freeze.rows-1");
    expect(calls.at(-1)).toEqual({ kind: "sheet.setFrozenRows", args: [1] });
    expect(rows.find((r) => r.id === "view.freeze.rows-1")!.checked!()).toBe(true);
    runId("view.freeze.cols-2");
    expect(calls.at(-1)).toEqual({ kind: "sheet.setFrozenColumns", args: [2] });
    runId("view.freeze.rows-current");
    expect(calls.at(-1)).toEqual({ kind: "exec", args: ["sheet.command.set-row-frozen"] });
    runId("format.number.percent");
    expect(calls.at(-1)).toEqual({ kind: "range.setNumberFormat", args: ["0.00%"] });
    runId("format.number.currency");
    expect(calls.at(-1)).toEqual({ kind: "range.setNumberFormat", args: ['"$"#,##0.00'] });
    runId("view.show.gridlines");
    expect(calls.at(-1)).toEqual({ kind: "sheet.setHiddenGridlines", args: [true] });
    runId("view.zoom.150");
    expect(calls.at(-1)).toEqual({ kind: "sheet.zoom", args: [1.5] });
    runId("insert.checkbox");
    expect(calls.at(-1)).toEqual({ kind: "range.setDataValidation", args: ["checkbox-rule"] });
    runId("view.show.formula-bar");
    expect(calls.at(-1)?.kind).toBe("host.toggleFormulaBar");
  });

  it("Google's number-format shortcuts are bound by the chrome (Univer has none)", () => {
    const rows = flattenMenus(buildSheetMenus(fakeHost().host));
    const pct = rows.find((r) => r.id === "format.number.percent")!;
    expect(pct.shortcut).toEqual({ key: "5", mod: true, shift: true, bind: true });
    // Univer binds ⌘B itself — the chrome must not bind it a second time (it would toggle twice).
    expect(rows.find((r) => r.id === "format.text.bold")!.shortcut?.bind).toBeFalsy();
  });
});

describe("data cleanup", () => {
  it("trim whitespace trims text, keeps formulas", () => {
    const { host, calls } = fakeHost();
    void host;
    const set: unknown[][][] = [];
    const r = {
      getValues: () => [["  a ", 2, "=x"]],
      getFormulas: () => [["", "", "=SUM(A1)"]],
      setValues: (v: unknown[][]) => set.push(v),
    } as unknown as RangeLike;
    expect(trimWhitespace(r)).toBe(1);
    expect(set[0]).toEqual([["a", 2, "=SUM(A1)"]]);
    expect(calls).toEqual([]);
  });

  it("remove duplicates keeps the first row and blanks the tail; refuses formulas", () => {
    const set: unknown[][][] = [];
    const r = {
      getValues: () => [["a", 1], ["b", 2], ["a", 1]],
      getFormulas: () => [["", ""], ["", ""], ["", ""]],
      setValues: (v: unknown[][]) => set.push(v),
    } as unknown as RangeLike;
    expect(removeDuplicateRows(r)).toBe(1);
    expect(set[0]).toEqual([["a", 1], ["b", 2], [null, null]]);
    const f = { ...r, getFormulas: () => [["=A2", ""], ["", ""], ["", ""]] } as unknown as RangeLike;
    expect(removeDuplicateRows(f)).toBe("formulas");
  });
});
