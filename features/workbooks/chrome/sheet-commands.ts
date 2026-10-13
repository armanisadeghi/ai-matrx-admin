/**
 * The workbook editor's command map — Google Sheets' menus and toolbar, each
 * row wired to a real Univer 1.0.4 command (by id, through
 * `univerAPI.executeCommand`) or to the Univer facade call that issues one.
 * A row Univer's free presets cannot do is absent, never disabled forever.
 *
 * Pure data + calls through `SheetChromeHost`, so the mapping is tested with
 * a recording fake (`__tests__/sheet-commands.test.ts`), including a check that
 * every command id below exists in the installed Univer bundles.
 */

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowDownZA,
  Baseline,
  Bold,
  Clipboard,
  Copy,
  DollarSign,
  Filter,
  Grid3x3,
  Image,
  Italic,
  Link,
  MessageSquarePlus,
  PaintBucket,
  PaintRoller,
  Percent,
  Printer,
  Redo2,
  RotateCw,
  Scissors,
  Search,
  Sigma,
  Strikethrough,
  TableCellsMerge,
  Underline,
  Undo2,
  WrapText,
  AlignVerticalJustifyCenter,
  Minus,
  Plus,
  DecimalsArrowLeft,
  DecimalsArrowRight,
} from "lucide-react";

import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
import type { EditorMenu, EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";
import type { EditorToolbarItem } from "@/components/editor-chrome/EditorToolbar";

// ─── the slice of Univer's facade this map uses (structural, so tests can fake it) ───

export type CellStyleLike = {
  bl?: number;
  it?: number;
  ul?: { s?: number } | null;
  st?: { s?: number } | null;
  ff?: string | null;
  fs?: number | null;
} | null;

export interface RangeLike {
  setNumberFormat(pattern: string): unknown;
  getRange(): { startRow: number; endRow: number; startColumn: number; endColumn: number };
  getValues(): unknown[][];
  getFormulas(): string[][];
  setValues(values: unknown[][]): unknown;
  getCellStyleData(): CellStyleLike;
  isMerged(): boolean;
  useThemeStyle(name: string | undefined): void;
  removeThemeStyle(name: string): void;
  getUsedThemeStyle(): string | undefined;
  setDataValidation(rule: unknown): unknown;
}

export interface WorksheetLike {
  getSheetId(): string;
  setFrozenRows(rows: number): unknown;
  setFrozenColumns(columns: number): unknown;
  getFrozenRows(): number;
  getFrozenColumns(): number;
  setHiddenGridlines(hidden: boolean): unknown;
  hasHiddenGridLines(): boolean;
  zoom(ratio: number): unknown;
  getZoom(): number;
  getSelection(): { getActiveRange(): RangeLike | null } | null;
}

export interface DataValidationBuilderLike {
  requireCheckbox(): { build(): unknown };
  requireValueInList(values: string[], multiple?: boolean, showDropdown?: boolean): { build(): unknown };
}

export interface SheetsApiLike {
  executeCommand(id: string, params?: object): Promise<unknown> | unknown;
  getActiveWorkbook(): { getActiveSheet(): WorksheetLike | null } | null;
  newDataValidation(): DataValidationBuilderLike;
}

export interface SheetChromeHost {
  api: SheetsApiLike;
  editable: boolean;
  print: () => void;
  formulaBarVisible: () => boolean;
  toggleFormulaBar: () => void;
  fullScreen: () => boolean;
  toggleFullScreen: () => void;
  notify: (message: string) => void;
}

// ─── Univer enums (values from @univerjs/core 1.0.4) ───
const H_ALIGN = { left: 1, center: 2, right: 3 } as const;
const V_ALIGN = { top: 1, middle: 2, bottom: 3 } as const;
const WRAP = { overflow: 1, clip: 2, wrap: 3 } as const;
const BORDER_THIN = 1;
const SPLIT = { Tab: 1, Comma: 2, Semicolon: 4, Space: 8 } as const;

/** Google Sheets' number formats → the Excel-style patterns Univer's numfmt reads. */
export const NUMBER_FORMATS = [
  { id: "automatic", label: "Automatic", pattern: "General" },
  { id: "plain-text", label: "Plain text", pattern: "@" },
  { id: "number", label: "Number", pattern: "#,##0.00", shortcut: "1" },
  { id: "percent", label: "Percent", pattern: "0.00%", shortcut: "5" },
  { id: "scientific", label: "Scientific", pattern: "0.00E+00", shortcut: "6" },
  { id: "accounting", label: "Accounting", pattern: '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)' },
  { id: "financial", label: "Financial", pattern: "#,##0.00;(#,##0.00)" },
  { id: "currency", label: "Currency", pattern: '"$"#,##0.00', shortcut: "4" },
  { id: "currency-rounded", label: "Currency rounded", pattern: '"$"#,##0' },
  { id: "date", label: "Date", pattern: "m/d/yyyy", shortcut: "3" },
  { id: "time", label: "Time", pattern: "h:mm:ss AM/PM", shortcut: "2" },
  { id: "date-time", label: "Date time", pattern: "m/d/yyyy h:mm:ss" },
  { id: "duration", label: "Duration", pattern: "[h]:mm:ss" },
] as const;

export const FONT_FAMILIES = [
  "Arial",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Courier New",
  "Georgia",
  "Helvetica",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;
export const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 18, 24, 36] as const;
export const ZOOMS = [50, 75, 90, 100, 125, 150, 200] as const;
export const COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Dark gray", value: "#434343" },
  { label: "Gray", value: "#999999" },
  { label: "White", value: "#ffffff" },
  { label: "Red", value: "#e06666" },
  { label: "Orange", value: "#f6b26b" },
  { label: "Yellow", value: "#ffd966" },
  { label: "Green", value: "#93c47d" },
  { label: "Cyan", value: "#76a5af" },
  { label: "Blue", value: "#6fa8dc" },
  { label: "Purple", value: "#8e7cc3" },
  { label: "Magenta", value: "#c27ba0" },
] as const;
const FUNCTIONS = ["SUM", "AVERAGE", "COUNT", "MAX", "MIN"] as const;

// ─── helpers ───

const sheetOf = (h: SheetChromeHost) => h.api.getActiveWorkbook()?.getActiveSheet() ?? null;
const rangeOf = (h: SheetChromeHost) => sheetOf(h)?.getSelection()?.getActiveRange() ?? null;
const run = (h: SheetChromeHost, id: string, params?: object) => () =>
  params ? h.api.executeCommand(id, params) : h.api.executeCommand(id);

function withRange(h: SheetChromeHost, fn: (r: RangeLike) => unknown) {
  return () => {
    const r = rangeOf(h);
    if (!r) {
      h.notify("Select cells first");
      return undefined;
    }
    return fn(r);
  };
}
function withSheet(h: SheetChromeHost, fn: (s: WorksheetLike) => unknown) {
  return () => {
    const s = sheetOf(h);
    return s ? fn(s) : undefined;
  };
}

const hasFormula = (formulas: string[][]) => formulas.some((row) => row.some((f) => !!f));

/** Data → Data cleanup → Trim whitespace: leading/trailing spaces off every text cell (formulas untouched). */
export function trimWhitespace(r: RangeLike): number {
  const values = r.getValues();
  const formulas = r.getFormulas();
  let changed = 0;
  const next = values.map((row, i) =>
    row.map((v, j) => {
      // A formula goes back as its "=…" text, which the facade writes as a formula.
      if (formulas[i]?.[j]) return formulas[i]![j];
      if (typeof v === "string" && v !== v.trim()) {
        changed += 1;
        return v.trim();
      }
      return v ?? null;
    }),
  );
  if (changed) r.setValues(next);
  return changed;
}

/** Data → Data cleanup → Remove duplicates: keep the first of identical rows in the selection. */
export function removeDuplicateRows(r: RangeLike): number | "formulas" {
  if (hasFormula(r.getFormulas())) return "formulas";
  const rows = r.getValues();
  const seen = new Set<string>();
  const kept: unknown[][] = [];
  for (const row of rows) {
    const key = JSON.stringify(row.map((v) => (v === undefined ? null : v)));
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  const removed = rows.length - kept.length;
  if (!removed) return 0;
  const width = rows[0]?.length ?? 0;
  while (kept.length < rows.length) kept.push(Array.from({ length: width }, () => null));
  r.setValues(kept.map((row) => row.map((v) => (v === undefined ? null : v))));
  return removed;
}

function numberFormatEntries(h: SheetChromeHost): EditorMenuEntry[] {
  return [
    ...NUMBER_FORMATS.map(
      (f): EditorMenuEntry => ({
        kind: "action",
        id: `format.number.${f.id}`,
        label: f.label,
        keywords: ["number format", f.pattern],
        ...("shortcut" in f ? { shortcut: { key: f.shortcut, mod: true, shift: true, bind: true } } : {}),
        run: withRange(h, (r) => r.setNumberFormat(f.pattern)),
      }),
    ),
    { kind: "separator" },
    {
      kind: "action",
      id: "format.number.custom",
      label: "Custom number format",
      keywords: ["more formats"],
      // Our own dialog (Univer's side panel is unstyled for this app); the pattern goes through the same range call.
      run: withRange(h, async (r) => {
        const answers = await promptForValues({
          title: "Custom number format",
          submitLabel: "Apply",
          fields: [{ name: "pattern", prompt: "Format, e.g. #,##0.00 or 0.0%", defaultValue: "#,##0.00", required: true }],
        });
        const pattern = answers?.pattern?.trim();
        if (pattern) r.setNumberFormat(pattern);
      }),
    },
  ];
}

function colorEntries(h: SheetChromeHost, kind: "text" | "fill"): EditorMenuEntry[] {
  const command = kind === "text" ? "sheet.command.set-range-text-color" : "sheet.command.set-background-color";
  const reset = kind === "text" ? "sheet.command.reset-range-text-color" : "sheet.command.reset-background-color";
  return [
    { kind: "action", id: `format.${kind}-color.reset`, label: "Reset", run: run(h, reset) },
    { kind: "separator" },
    ...COLORS.map(
      (c): EditorMenuEntry => ({
        kind: "action",
        id: `format.${kind}-color.${c.label.toLowerCase().replace(/\s+/g, "-")}`,
        label: c.label,
        keywords: [kind === "text" ? "text color" : "fill color", "colour"],
        run: run(h, command, { value: c.value }),
      }),
    ),
  ];
}

const borderEntries = (h: SheetChromeHost): EditorMenuEntry[] =>
  (
    [
      ["all", "All borders"],
      ["inside", "Inner borders"],
      ["horizontal", "Horizontal borders"],
      ["vertical", "Vertical borders"],
      ["outside", "Outer borders"],
      ["left", "Left border"],
      ["top", "Top border"],
      ["right", "Right border"],
      ["bottom", "Bottom border"],
      ["none", "Clear borders"],
    ] as const
  ).map(([type, label]) => ({
    kind: "action" as const,
    id: `format.borders.${type}`,
    label,
    keywords: ["borders"],
    run: run(h, "sheet.command.set-border-basic", { value: { type, color: "#000000", style: BORDER_THIN } }),
  }));

const mergeEntries = (h: SheetChromeHost): EditorMenuEntry[] => [
  { kind: "action", id: "format.merge.all", label: "Merge all", keywords: ["merge cells"], run: run(h, "sheet.command.add-worksheet-merge-all") },
  { kind: "action", id: "format.merge.vertical", label: "Merge vertically", keywords: ["merge cells"], run: run(h, "sheet.command.add-worksheet-merge-vertical") },
  { kind: "action", id: "format.merge.horizontal", label: "Merge horizontally", keywords: ["merge cells"], run: run(h, "sheet.command.add-worksheet-merge-horizontal") },
  { kind: "action", id: "format.merge.unmerge", label: "Unmerge", keywords: ["merge cells"], run: run(h, "sheet.command.remove-worksheet-merge") },
];

const hAlignEntries = (h: SheetChromeHost): EditorMenuEntry[] => [
  { kind: "action", id: "format.align.left", label: "Left", icon: AlignLeft, keywords: ["align"], shortcut: { key: "l", mod: true, shift: true, bind: true }, run: run(h, "sheet.command.set-horizontal-text-align", { value: H_ALIGN.left }) },
  { kind: "action", id: "format.align.center", label: "Center", icon: AlignCenter, keywords: ["align"], shortcut: { key: "e", mod: true, shift: true, bind: true }, run: run(h, "sheet.command.set-horizontal-text-align", { value: H_ALIGN.center }) },
  { kind: "action", id: "format.align.right", label: "Right", icon: AlignRight, keywords: ["align"], shortcut: { key: "r", mod: true, shift: true, bind: true }, run: run(h, "sheet.command.set-horizontal-text-align", { value: H_ALIGN.right }) },
];
const vAlignEntries = (h: SheetChromeHost): EditorMenuEntry[] => [
  { kind: "action", id: "format.valign.top", label: "Top", keywords: ["vertical align"], run: run(h, "sheet.command.set-vertical-text-align", { value: V_ALIGN.top }) },
  { kind: "action", id: "format.valign.middle", label: "Middle", keywords: ["vertical align"], run: run(h, "sheet.command.set-vertical-text-align", { value: V_ALIGN.middle }) },
  { kind: "action", id: "format.valign.bottom", label: "Bottom", keywords: ["vertical align"], run: run(h, "sheet.command.set-vertical-text-align", { value: V_ALIGN.bottom }) },
];
const wrapEntries = (h: SheetChromeHost): EditorMenuEntry[] => [
  { kind: "action", id: "format.wrap.overflow", label: "Overflow", keywords: ["text wrapping"], run: run(h, "sheet.command.set-text-wrap", { value: WRAP.overflow }) },
  { kind: "action", id: "format.wrap.wrap", label: "Wrap", keywords: ["text wrapping"], run: run(h, "sheet.command.set-text-wrap", { value: WRAP.wrap }) },
  { kind: "action", id: "format.wrap.clip", label: "Clip", keywords: ["text wrapping"], run: run(h, "sheet.command.set-text-wrap", { value: WRAP.clip }) },
];
const rotationEntries = (h: SheetChromeHost): EditorMenuEntry[] =>
  (
    [
      ["none", "None", 0],
      ["tilt-up", "Tilt up", 45],
      ["tilt-down", "Tilt down", -45],
      ["stack", "Stack vertically", "v"],
      ["rotate-up", "Rotate up", 90],
      ["rotate-down", "Rotate down", -90],
    ] as const
  ).map(([id, label, value]) => ({
    kind: "action" as const,
    id: `format.rotation.${id}`,
    label,
    keywords: ["text rotation"],
    run: run(h, "sheet.command.set-text-rotation", { value }),
  }));

const fontSizeEntries = (h: SheetChromeHost): EditorMenuEntry[] =>
  FONT_SIZES.map((s) => ({
    kind: "action" as const,
    id: `format.font-size.${s}`,
    label: String(s),
    keywords: ["font size"],
    run: run(h, "sheet.command.set-range-fontsize", { value: s }),
  }));

const fontFamilyEntries = (h: SheetChromeHost): EditorMenuEntry[] =>
  FONT_FAMILIES.map((f) => ({
    kind: "action" as const,
    id: `format.font.${f.toLowerCase().replace(/\s+/g, "-")}`,
    label: f,
    keywords: ["font"],
    run: run(h, "sheet.command.set-range-font-family", { value: f }),
  }));

const zoomEntries = (h: SheetChromeHost): EditorMenuEntry[] =>
  ZOOMS.map((z) => ({
    kind: "action" as const,
    id: `view.zoom.${z}`,
    label: `${z}%`,
    keywords: ["zoom"],
    checked: () => Math.round((sheetOf(h)?.getZoom() ?? 1) * 100) === z,
    run: withSheet(h, (s) => s.zoom(z / 100)),
  }));

const functionEntries = (h: SheetChromeHost): EditorMenuEntry[] => [
  ...FUNCTIONS.map((f) => ({
    kind: "action" as const,
    id: `insert.function.${f.toLowerCase()}`,
    label: f,
    keywords: ["function", "formula"],
    run: run(h, "formula-ui.operation.insert-function", { value: f }),
  })),
  { kind: "separator" },
  { kind: "action", id: "insert.function.all", label: "All functions", keywords: ["function", "formula"], run: run(h, "formula-ui.operation.more-functions") },
];

// ─── the menus ───

export function buildSheetMenus(h: SheetChromeHost): EditorMenu[] {
  const freeze = (rows: number | null, cols: number | null) =>
    withSheet(h, (s) => {
      if (rows !== null) s.setFrozenRows(rows);
      if (cols !== null) s.setFrozenColumns(cols);
    });

  return [
    {
      id: "edit",
      label: "Edit",
      items: [
        { kind: "action", id: "edit.undo", label: "Undo", icon: Undo2, shortcut: { key: "z", mod: true }, run: run(h, "univer.command.undo") },
        { kind: "action", id: "edit.redo", label: "Redo", icon: Redo2, shortcut: { key: "y", mod: true }, run: run(h, "univer.command.redo") },
        { kind: "separator" },
        { kind: "action", id: "edit.cut", label: "Cut", icon: Scissors, shortcut: { key: "x", mod: true }, run: run(h, "univer.command.cut") },
        { kind: "action", id: "edit.copy", label: "Copy", icon: Copy, shortcut: { key: "c", mod: true }, run: run(h, "univer.command.copy") },
        { kind: "action", id: "edit.paste", label: "Paste", icon: Clipboard, shortcut: { key: "v", mod: true }, run: run(h, "univer.command.paste") },
        {
          kind: "submenu",
          id: "edit.paste-special",
          label: "Paste special",
          items: [
            { kind: "action", id: "edit.paste-special.values", label: "Values only", run: run(h, "sheet.command.paste-value") },
            { kind: "action", id: "edit.paste-special.format", label: "Format only", run: run(h, "sheet.command.paste-format") },
            { kind: "action", id: "edit.paste-special.formula", label: "Formula only", run: run(h, "sheet.command.paste-formula") },
            { kind: "action", id: "edit.paste-special.col-width", label: "Column width only", run: run(h, "sheet.command.paste-col-width") },
            { kind: "action", id: "edit.paste-special.no-borders", label: "All except borders", run: run(h, "sheet.command.paste-besides-border") },
          ],
        },
        { kind: "separator" },
        { kind: "action", id: "edit.find", label: "Find", icon: Search, shortcut: { key: "f", mod: true }, run: run(h, "ui.operation.open-find-dialog") },
        { kind: "action", id: "edit.find-replace", label: "Find and replace", shortcut: { key: "h", mod: true }, run: run(h, "ui.operation.open-replace-dialog") },
        { kind: "separator" },
        {
          kind: "submenu",
          id: "edit.delete",
          label: "Delete",
          items: [
            { kind: "action", id: "edit.delete.values", label: "Values", shortcut: { key: "Delete" }, run: run(h, "sheet.command.clear-selection-content") },
            { kind: "action", id: "edit.delete.row", label: "Row", keywords: ["delete row"], run: run(h, "sheet.command.remove-row-confirm") },
            { kind: "action", id: "edit.delete.column", label: "Column", keywords: ["delete column"], run: run(h, "sheet.command.remove-col-confirm") },
            { kind: "action", id: "edit.delete.cells-up", label: "Cells and shift up", run: run(h, "sheet.command.delete-range-move-up-confirm") },
            { kind: "action", id: "edit.delete.cells-left", label: "Cells and shift left", run: run(h, "sheet.command.delete-range-move-left-confirm") },
            { kind: "action", id: "edit.delete.sheet", label: "Sheet", keywords: ["delete sheet"], run: run(h, "sheet.command.remove-sheet-confirm") },
          ],
        },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        {
          kind: "submenu",
          id: "view.show",
          label: "Show",
          items: [
            {
              kind: "action",
              id: "view.show.gridlines",
              label: "Gridlines",
              keywords: ["show gridlines"],
              checked: () => !(sheetOf(h)?.hasHiddenGridLines() ?? false),
              run: withSheet(h, (s) => s.setHiddenGridlines(!s.hasHiddenGridLines())),
            },
            {
              kind: "action",
              id: "view.show.formula-bar",
              label: "Formula bar",
              keywords: ["show formula bar"],
              checked: () => h.formulaBarVisible(),
              run: () => h.toggleFormulaBar(),
            },
          ],
        },
        {
          kind: "submenu",
          id: "view.freeze",
          label: "Freeze",
          keywords: ["freeze", "frozen", "pin"],
          items: [
            { kind: "action", id: "view.freeze.rows-0", label: "No rows", checked: () => sheetOf(h)?.getFrozenRows() === 0, run: freeze(0, null) },
            { kind: "action", id: "view.freeze.rows-1", label: "1 row", checked: () => sheetOf(h)?.getFrozenRows() === 1, run: freeze(1, null) },
            { kind: "action", id: "view.freeze.rows-2", label: "2 rows", checked: () => sheetOf(h)?.getFrozenRows() === 2, run: freeze(2, null) },
            { kind: "action", id: "view.freeze.rows-current", label: "Up to current row", run: run(h, "sheet.command.set-row-frozen") },
            { kind: "separator" },
            { kind: "action", id: "view.freeze.cols-0", label: "No columns", checked: () => sheetOf(h)?.getFrozenColumns() === 0, run: freeze(null, 0) },
            { kind: "action", id: "view.freeze.cols-1", label: "1 column", checked: () => sheetOf(h)?.getFrozenColumns() === 1, run: freeze(null, 1) },
            { kind: "action", id: "view.freeze.cols-2", label: "2 columns", checked: () => sheetOf(h)?.getFrozenColumns() === 2, run: freeze(null, 2) },
            { kind: "action", id: "view.freeze.cols-current", label: "Up to current column", run: run(h, "sheet.command.set-col-frozen") },
          ],
        },
        { kind: "submenu", id: "view.zoom", label: "Zoom", items: zoomEntries(h) },
        {
          kind: "submenu",
          id: "view.rows",
          label: "Rows",
          keywords: ["hide rows", "unhide rows"],
          items: [
            { kind: "action", id: "view.rows.hide", label: "Hide selected rows", run: run(h, "sheet.command.hide-row-confirm") },
            { kind: "action", id: "view.rows.show", label: "Unhide selected rows", run: run(h, "sheet.command.set-selected-rows-visible") },
          ],
        },
        {
          kind: "submenu",
          id: "view.columns",
          label: "Columns",
          keywords: ["hide columns", "unhide columns"],
          items: [
            { kind: "action", id: "view.columns.hide", label: "Hide selected columns", run: run(h, "sheet.command.hide-col-confirm") },
            { kind: "action", id: "view.columns.show", label: "Unhide selected columns", run: run(h, "sheet.command.set-selected-cols-visible") },
          ],
        },
        { kind: "separator" },
        { kind: "action", id: "view.comments", label: "Comments", keywords: ["comment panel"], run: run(h, "sheet.operation.toggle-comment-panel") },
        { kind: "action", id: "view.full-screen", label: "Full screen", checked: () => h.fullScreen(), run: () => h.toggleFullScreen() },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      items: [
        {
          kind: "submenu",
          id: "insert.cells",
          label: "Cells",
          items: [
            { kind: "action", id: "insert.cells.right", label: "Insert cells and shift right", run: run(h, "sheet.command.insert-range-move-right-confirm") },
            { kind: "action", id: "insert.cells.down", label: "Insert cells and shift down", run: run(h, "sheet.command.insert-range-move-down-confirm") },
          ],
        },
        {
          kind: "submenu",
          id: "insert.rows",
          label: "Rows",
          items: [
            { kind: "action", id: "insert.rows.above", label: "Insert 1 row above", keywords: ["insert row"], run: run(h, "sheet.command.insert-row-before") },
            { kind: "action", id: "insert.rows.below", label: "Insert 1 row below", keywords: ["insert row"], run: run(h, "sheet.command.insert-row-after") },
          ],
        },
        {
          kind: "submenu",
          id: "insert.columns",
          label: "Columns",
          items: [
            { kind: "action", id: "insert.columns.left", label: "Insert 1 column left", keywords: ["insert column"], run: run(h, "sheet.command.insert-col-before") },
            { kind: "action", id: "insert.columns.right", label: "Insert 1 column right", keywords: ["insert column"], run: run(h, "sheet.command.insert-col-after") },
          ],
        },
        { kind: "action", id: "insert.sheet", label: "Sheet", keywords: ["new sheet", "tab"], run: run(h, "sheet.command.insert-sheet") },
        { kind: "separator" },
        { kind: "action", id: "insert.table", label: "Table", keywords: ["convert to table"], run: run(h, "sheet.operation.open-table-selector") },
        {
          kind: "submenu",
          id: "insert.image",
          label: "Image",
          icon: Image,
          items: [
            { kind: "action", id: "insert.image.in-cell", label: "Insert image in cell", run: run(h, "sheet.command.insert-cell-image") },
            { kind: "action", id: "insert.image.over-cells", label: "Insert image over cells", run: run(h, "sheet.command.insert-float-image") },
          ],
        },
        { kind: "separator" },
        { kind: "submenu", id: "insert.function", label: "Function", icon: Sigma, items: functionEntries(h) },
        { kind: "separator" },
        { kind: "action", id: "insert.link", label: "Link", icon: Link, shortcut: { key: "k", mod: true }, run: run(h, "sheet.operation.insert-hyper-link-toolbar") },
        {
          kind: "action",
          id: "insert.checkbox",
          label: "Checkbox",
          keywords: ["tick box"],
          run: withRange(h, (r) => r.setDataValidation(h.api.newDataValidation().requireCheckbox().build())),
        },
        {
          kind: "action",
          id: "insert.dropdown",
          label: "Dropdown",
          keywords: ["list", "chips"],
          run: withRange(h, (r) => {
            r.setDataValidation(h.api.newDataValidation().requireValueInList(["Option 1", "Option 2"], false, true).build());
            return h.api.executeCommand("data-validation.operation.open-validation-panel", {});
          }),
        },
        { kind: "separator" },
        { kind: "action", id: "insert.comment", label: "Comment", icon: MessageSquarePlus, shortcut: { key: "m", mod: true, alt: true }, run: run(h, "sheet.operation.show-comment-modal") },
        { kind: "action", id: "insert.note", label: "Note", run: run(h, "sheet.operation.add-note-popup") },
      ],
    },
    {
      id: "format",
      label: "Format",
      items: [
        { kind: "submenu", id: "format.number", label: "Number", icon: DollarSign, items: numberFormatEntries(h) },
        {
          kind: "submenu",
          id: "format.text",
          label: "Text",
          icon: Bold,
          items: [
            { kind: "action", id: "format.text.bold", label: "Bold", icon: Bold, shortcut: { key: "b", mod: true }, run: run(h, "sheet.command.set-range-bold") },
            { kind: "action", id: "format.text.italic", label: "Italic", icon: Italic, shortcut: { key: "i", mod: true }, run: run(h, "sheet.command.set-range-italic") },
            { kind: "action", id: "format.text.underline", label: "Underline", icon: Underline, shortcut: { key: "u", mod: true }, run: run(h, "sheet.command.set-range-underline") },
            { kind: "action", id: "format.text.strikethrough", label: "Strikethrough", icon: Strikethrough, shortcut: { key: "x", mod: true, shift: true }, run: run(h, "sheet.command.set-range-stroke") },
          ],
        },
        {
          kind: "submenu",
          id: "format.alignment",
          label: "Alignment",
          icon: AlignLeft,
          items: [...hAlignEntries(h), { kind: "separator" }, ...vAlignEntries(h)],
        },
        { kind: "submenu", id: "format.wrapping", label: "Wrapping", icon: WrapText, items: wrapEntries(h) },
        { kind: "submenu", id: "format.rotation", label: "Rotation", icon: RotateCw, items: rotationEntries(h) },
        { kind: "separator" },
        { kind: "submenu", id: "format.font-size", label: "Font size", items: fontSizeEntries(h) },
        { kind: "submenu", id: "format.merge", label: "Merge cells", icon: TableCellsMerge, items: mergeEntries(h) },
        { kind: "separator" },
        { kind: "action", id: "format.convert-table", label: "Convert to table", run: run(h, "sheet.operation.open-table-selector") },
        { kind: "action", id: "format.conditional", label: "Conditional formatting", run: run(h, "sheet.operation.open.conditional.formatting.panel", { value: 1 }) },
        {
          kind: "action",
          id: "format.alternating",
          label: "Alternating colors",
          keywords: ["banded rows", "zebra"],
          run: withRange(h, (r) => {
            const used = r.getUsedThemeStyle();
            if (used) r.removeThemeStyle(used);
            else r.useThemeStyle("default");
          }),
        },
        { kind: "separator" },
        { kind: "action", id: "format.clear", label: "Clear formatting", keywords: ["remove formatting"], run: run(h, "sheet.command.clear-selection-format") },
      ],
    },
    {
      id: "data",
      label: "Data",
      items: [
        { kind: "action", id: "data.sort-sheet-asc", label: "Sort sheet A to Z", icon: ArrowDownAZ, run: run(h, "sheet.command.sort-range-asc-ext") },
        { kind: "action", id: "data.sort-sheet-desc", label: "Sort sheet Z to A", icon: ArrowDownZA, run: run(h, "sheet.command.sort-range-desc-ext") },
        {
          kind: "submenu",
          id: "data.sort-range",
          label: "Sort range",
          items: [
            { kind: "action", id: "data.sort-range.asc", label: "Sort range A to Z", run: run(h, "sheet.command.sort-range-asc") },
            { kind: "action", id: "data.sort-range.desc", label: "Sort range Z to A", run: run(h, "sheet.command.sort-range-desc") },
            { kind: "action", id: "data.sort-range.advanced", label: "Advanced range sorting options", run: run(h, "sheet.command.sort-range-custom") },
          ],
        },
        { kind: "separator" },
        { kind: "action", id: "data.filter", label: "Create a filter", icon: Filter, keywords: ["remove filter"], run: run(h, "sheet.command.smart-toggle-filter") },
        { kind: "action", id: "data.validation", label: "Data validation", run: run(h, "data-validation.operation.open-validation-panel", {}) },
        { kind: "separator" },
        {
          kind: "submenu",
          id: "data.split",
          label: "Split text to columns",
          items: (Object.keys(SPLIT) as (keyof typeof SPLIT)[]).map((name) => ({
            kind: "action" as const,
            id: `data.split.${name.toLowerCase()}`,
            label: name,
            keywords: ["split text", "separator"],
            run: withRange(h, (r) => {
              const sheet = sheetOf(h);
              return h.api.executeCommand("sheet.command.split-text-to-columns", {
                ...(sheet ? { subUnitId: sheet.getSheetId() } : {}),
                range: r.getRange(),
                delimiter: SPLIT[name],
              });
            }),
          })),
        },
        {
          kind: "submenu",
          id: "data.cleanup",
          label: "Data cleanup",
          items: [
            {
              kind: "action",
              id: "data.cleanup.duplicates",
              label: "Remove duplicates",
              run: withRange(h, (r) => {
                const removed = removeDuplicateRows(r);
                h.notify(
                  removed === "formulas"
                    ? "Remove duplicates skips ranges with formulas"
                    : removed === 0
                      ? "No duplicate rows found"
                      : `${removed} duplicate row${removed === 1 ? "" : "s"} removed`,
                );
              }),
            },
            {
              kind: "action",
              id: "data.cleanup.trim",
              label: "Trim whitespace",
              run: withRange(h, (r) => {
                const n = trimWhitespace(r);
                h.notify(n ? `${n} cell${n === 1 ? "" : "s"} trimmed` : "No extra spaces found");
              }),
            },
          ],
        },
        { kind: "separator" },
        { kind: "action", id: "data.protect", label: "Protect sheets and ranges", keywords: ["permission", "lock"], run: run(h, "sheet.command.add-range-protection-from-toolbar") },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      items: [
        { kind: "action", id: "tools.functions", label: "Function list", icon: Sigma, run: run(h, "formula-ui.operation.more-functions") },
        { kind: "action", id: "tools.protect", label: "Protect sheets and ranges", run: run(h, "sheet.command.add-range-protection-from-toolbar") },
        { kind: "action", id: "tools.comments", label: "Comments panel", run: run(h, "sheet.operation.toggle-comment-panel") },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { kind: "action", id: "help.shortcuts", label: "Keyboard shortcuts", shortcut: { key: "\\", mod: true }, run: run(h, "base-ui.operation.toggle-shortcut-panel") },
        { kind: "action", id: "help.functions", label: "Function list", run: run(h, "formula-ui.operation.more-functions") },
      ],
    },
  ];
}

/** Google Sheets' toolbar row. `style` is the active cell's style (bold etc. light up). */
export function buildSheetToolbar(h: SheetChromeHost): EditorToolbarItem[] {
  const sheet = sheetOf(h);
  const range = sheet?.getSelection()?.getActiveRange() ?? null;
  const style = range?.getCellStyleData() ?? null;
  const zoom = Math.round((sheet?.getZoom() ?? 1) * 100);
  const size = style?.fs ?? 11;
  const font = style?.ff ?? "Arial";
  const ro = !h.editable;
  return [
    { kind: "button", id: "tb.undo", label: "Undo", icon: Undo2, shortcut: { key: "z", mod: true }, run: run(h, "univer.command.undo"), disabled: ro },
    { kind: "button", id: "tb.redo", label: "Redo", icon: Redo2, shortcut: { key: "y", mod: true }, run: run(h, "univer.command.redo"), disabled: ro },
    { kind: "button", id: "tb.print", label: "Print", icon: Printer, run: () => h.print() },
    { kind: "button", id: "tb.paint-format", label: "Paint format", icon: PaintRoller, run: run(h, "sheet.command.set-once-format-painter"), disabled: ro },
    { kind: "menu", id: "tb.zoom", label: "Zoom", text: `${zoom}%`, widthClass: "w-[4.25rem]", items: zoomEntries(h) },
    { kind: "separator", id: "tb.s1" },
    { kind: "button", id: "tb.currency", label: "Format as currency", icon: DollarSign, run: run(h, "sheet.command.numfmt.set.currency"), disabled: ro },
    { kind: "button", id: "tb.percent", label: "Format as percent", icon: Percent, run: run(h, "sheet.command.numfmt.set.percent"), disabled: ro },
    { kind: "button", id: "tb.decimal-less", label: "Decrease decimal places", icon: DecimalsArrowLeft, run: run(h, "sheet.command.numfmt.subtract.decimal.command"), disabled: ro },
    { kind: "button", id: "tb.decimal-more", label: "Increase decimal places", icon: DecimalsArrowRight, run: run(h, "sheet.command.numfmt.add.decimal.command"), disabled: ro },
    { kind: "menu", id: "tb.more-formats", label: "More formats", text: "123", widthClass: "w-[3.25rem]", items: numberFormatEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s2" },
    { kind: "menu", id: "tb.font", label: "Font", text: font, widthClass: "w-[7rem]", items: fontFamilyEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s3" },
    { kind: "button", id: "tb.size-down", label: "Decrease font size", icon: Minus, shortcut: { key: ",", mod: true, shift: true }, run: run(h, "sheet.command.set-range-font-decrease"), disabled: ro },
    { kind: "menu", id: "tb.size", label: "Font size", text: String(size), widthClass: "w-[3.5rem]", items: fontSizeEntries(h), disabled: ro },
    { kind: "button", id: "tb.size-up", label: "Increase font size", icon: Plus, shortcut: { key: ".", mod: true, shift: true }, run: run(h, "sheet.command.set-range-font-increase"), disabled: ro },
    { kind: "separator", id: "tb.s4" },
    { kind: "button", id: "tb.bold", label: "Bold", icon: Bold, shortcut: { key: "b", mod: true }, active: style?.bl === 1, run: run(h, "sheet.command.set-range-bold"), disabled: ro },
    { kind: "button", id: "tb.italic", label: "Italic", icon: Italic, shortcut: { key: "i", mod: true }, active: style?.it === 1, run: run(h, "sheet.command.set-range-italic"), disabled: ro },
    { kind: "button", id: "tb.strike", label: "Strikethrough", icon: Strikethrough, shortcut: { key: "x", mod: true, shift: true }, active: style?.st?.s === 1, run: run(h, "sheet.command.set-range-stroke"), disabled: ro },
    { kind: "menu", id: "tb.text-color", label: "Text color", icon: Baseline, items: colorEntries(h, "text"), disabled: ro },
    { kind: "separator", id: "tb.s5" },
    { kind: "menu", id: "tb.fill", label: "Fill color", icon: PaintBucket, items: colorEntries(h, "fill"), disabled: ro },
    { kind: "menu", id: "tb.borders", label: "Borders", icon: Grid3x3, items: borderEntries(h), disabled: ro },
    { kind: "menu", id: "tb.merge", label: "Merge cells", icon: TableCellsMerge, items: mergeEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s6" },
    { kind: "menu", id: "tb.halign", label: "Horizontal align", icon: AlignLeft, items: hAlignEntries(h), disabled: ro },
    { kind: "menu", id: "tb.valign", label: "Vertical align", icon: AlignVerticalJustifyCenter, items: vAlignEntries(h), disabled: ro },
    { kind: "menu", id: "tb.wrap", label: "Text wrapping", icon: WrapText, items: wrapEntries(h), disabled: ro },
    { kind: "menu", id: "tb.rotate", label: "Text rotation", icon: RotateCw, items: rotationEntries(h), disabled: ro },
    { kind: "separator", id: "tb.s7" },
    { kind: "button", id: "tb.link", label: "Insert link", icon: Link, shortcut: { key: "k", mod: true }, run: run(h, "sheet.operation.insert-hyper-link-toolbar"), disabled: ro },
    { kind: "button", id: "tb.comment", label: "Insert comment", icon: MessageSquarePlus, shortcut: { key: "m", mod: true, alt: true }, run: run(h, "sheet.operation.show-comment-modal") },
    { kind: "button", id: "tb.filter", label: "Create a filter", icon: Filter, run: run(h, "sheet.command.smart-toggle-filter"), disabled: ro },
    { kind: "menu", id: "tb.functions", label: "Functions", icon: Sigma, items: functionEntries(h), disabled: ro },
  ];
}
