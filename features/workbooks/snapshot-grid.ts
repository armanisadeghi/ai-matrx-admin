/**
 * features/workbooks/snapshot-grid.ts
 *
 * Snapshot → a formatted, read-only grid model: what a spreadsheet VIEW needs and the plain-string
 * `univer-snapshot-rows` does not carry — number/currency/date formats applied, checkbox cells
 * (data-validation ranges of type checkbox), alignment, bold/italic, fill and text colour, column
 * widths, merges, frozen rows/columns, hidden rows/columns and sheets. Pure (no DOM, no Univer
 * runtime): the signed-out share page draws it. The number formatter is the thumbnail's
 * (`formatCellValue`) so a tile, a share link and the editor read the same.
 */

import {
  cfMatch,
  formatCellValue,
  parseResource,
  type CfRule,
  type Workbook,
} from "@/features/templates/files/thumbnail/snapshot-preview-svg";

type Rgb = { rgb?: string | null } | null | undefined;
interface Style {
  bg?: Rgb;
  cl?: Rgb;
  bl?: number;
  it?: number;
  fs?: number;
  ht?: number;
  tb?: number;
  n?: { pattern?: string } | null;
}
interface Cell {
  v?: unknown;
  s?: string | Style | null;
}
interface Sheet {
  id?: string;
  name?: string;
  hidden?: number;
  cellData?: Record<string, Record<string, Cell | null | undefined>>;
  columnData?: Record<string, { w?: number; hd?: number } | null | undefined>;
  rowData?: Record<string, { h?: number; hd?: number } | null | undefined>;
  defaultColumnWidth?: number;
  defaultRowHeight?: number;
  mergeData?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>;
  showGridlines?: number;
  freeze?: { xSplit?: number; ySplit?: number };
}

export interface GridCell {
  text: string;
  /** A checkbox cell (a data-validation checkbox range): `checked` says its state. */
  checkbox?: { checked: boolean };
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  /** Font size in px (the snapshot stores points). */
  fontPx: number;
  bg?: string;
  color?: string;
  wrap: boolean;
  rowSpan: number;
  colSpan: number;
  /** Covered by a merge that starts elsewhere: draw nothing. */
  covered: boolean;
}

export interface GridSheet {
  id: string;
  name: string;
  /** Visible column indexes (hidden columns left out) with their pixel widths. */
  columns: Array<{ index: number; width: number }>;
  rows: Array<{ index: number; height: number; cells: GridCell[] }>;
  /** How many leading VISIBLE rows / columns stay put while scrolling. */
  frozenRows: number;
  frozenColumns: number;
  gridlines: boolean;
  /** Rows beyond the cap were left out. */
  truncatedFrom: number | null;
}

export const GRID_MAX_ROWS = 500;
export const GRID_MAX_COLUMNS = 60;

const PT_TO_PX = 1.333;
const isCheckboxValue = (v: unknown) => v === true || v === false || v === 1 || v === 0 || v === "TRUE" || v === "FALSE";
const isOn = (v: unknown) => v === true || v === 1 || v === "TRUE";

function hasValue(cell: Cell | null | undefined): boolean {
  const v = cell?.v;
  return v !== undefined && v !== null && v !== "";
}

/** Every visible sheet that has something in it, in tab order. Empty and hidden sheets are left out. */
export function snapshotToGridSheets(snapshot: unknown): GridSheet[] {
  if (typeof snapshot !== "object" || snapshot === null) return [];
  const wb = snapshot as Workbook;
  const sheets = wb.sheets ?? {};
  const order = (wb.sheetOrder ?? []).filter((id) => sheets[id]);
  const ids = order.length > 0 ? order : Object.keys(sheets);
  const out: GridSheet[] = [];
  for (const id of ids) {
    const grid = sheetToGrid(wb, id, sheets[id] as Sheet);
    if (grid) out.push(grid);
  }
  return out;
}

function sheetToGrid(wb: Workbook, id: string, sheet: Sheet): GridSheet | null {
  if (sheet.hidden === 1) return null;
  const cellData = sheet.cellData ?? {};
  let maxRow = -1;
  let maxCol = -1;
  for (const [rk, row] of Object.entries(cellData)) {
    const r = Number(rk);
    if (!Number.isInteger(r) || !row) continue;
    for (const [ck, cell] of Object.entries(row)) {
      const c = Number(ck);
      if (!Number.isInteger(c) || !hasValue(cell)) continue;
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }
  }
  if (maxRow < 0 || maxCol < 0) return null;

  const styles = wb.styles ?? {};
  const sheetId = sheet.id ?? id;
  const cfAll = parseResource<Record<string, CfRule[]>>(wb, "SHEET_CONDITIONAL_FORMATTING_PLUGIN");
  const cf = (cfAll?.[sheetId] ?? []).filter((r) => r.rule && r.ranges);
  const dvAll = parseResource<Record<string, Array<{ type?: string; ranges?: CfRule["ranges"] }>>>(
    wb,
    "SHEET_DATA_VALIDATION_PLUGIN",
  );
  const checkboxRanges = (dvAll?.[sheetId] ?? []).filter((d) => d.type === "checkbox").flatMap((d) => d.ranges ?? []);
  const inRanges = (rs: CfRule["ranges"], r: number, c: number) =>
    (rs ?? []).some((x) => r >= x.startRow && r <= x.endRow && c >= x.startColumn && c <= x.endColumn);

  const dcw = sheet.defaultColumnWidth ?? 88;
  const drh = sheet.defaultRowHeight ?? 24;
  const lastCol = Math.min(maxCol, GRID_MAX_COLUMNS - 1);
  const columns: GridSheet["columns"] = [];
  for (let c = 0; c <= lastCol; c += 1) {
    const col = sheet.columnData?.[String(c)];
    if (col?.hd === 1) continue;
    columns.push({ index: c, width: col?.w ?? dcw });
  }

  const merges = sheet.mergeData ?? [];
  const covered = new Set<string>();
  for (const m of merges) {
    for (let r = m.startRow; r <= m.endRow; r += 1)
      for (let c = m.startColumn; c <= m.endColumn; c += 1) if (r !== m.startRow || c !== m.startColumn) covered.add(`${r}:${c}`);
  }

  const rows: GridSheet["rows"] = [];
  const lastRow = Math.min(maxRow, GRID_MAX_ROWS - 1);
  for (let r = 0; r <= lastRow; r += 1) {
    const rd = sheet.rowData?.[String(r)];
    if (rd?.hd === 1) continue;
    const source = cellData[String(r)] ?? {};
    const cells: GridCell[] = columns.map(({ index: c }) => {
      const cell = source[String(c)] ?? undefined;
      const base: Style = (typeof cell?.s === "string" ? (styles[cell.s] as Style | null | undefined) : (cell?.s as Style | null | undefined)) ?? {};
      let st: Style = base;
      for (const rule of cf) {
        if (inRanges(rule.ranges, r, c) && rule.rule && cfMatch(rule.rule, cell?.v)) {
          st = { ...st, ...(rule.rule.style as Style | undefined) };
          break;
        }
      }
      const m = merges.find((mm) => mm.startRow === r && mm.startColumn === c);
      const v = cell?.v;
      const box = hasValue(cell) && inRanges(checkboxRanges, r, c) && isCheckboxValue(v);
      const numeric = typeof v === "number";
      const ht = st.ht ?? 0;
      return {
        text: box ? "" : hasValue(cell) ? formatCellValue(v, st.n?.pattern) : "",
        checkbox: box ? { checked: isOn(v) } : undefined,
        align: box || ht === 2 ? "center" : ht === 3 || (ht === 0 && numeric) ? "right" : "left",
        bold: st.bl === 1,
        italic: st.it === 1,
        fontPx: Math.round((st.fs ?? 10) * PT_TO_PX),
        bg: st.bg?.rgb ?? undefined,
        color: st.cl?.rgb ?? undefined,
        wrap: st.tb === 3,
        rowSpan: m ? m.endRow - m.startRow + 1 : 1,
        colSpan: m ? m.endColumn - m.startColumn + 1 : 1,
        covered: covered.has(`${r}:${c}`),
      };
    });
    rows.push({ index: r, height: rd?.h ?? drh, cells });
  }

  const ySplit = sheet.freeze?.ySplit ?? 0;
  const xSplit = sheet.freeze?.xSplit ?? 0;
  return {
    id: sheetId,
    name: sheet.name ?? "Sheet1",
    columns,
    rows,
    frozenRows: Math.min(rows.filter((r) => r.index < ySplit).length, rows.length),
    frozenColumns: Math.min(columns.filter((c) => c.index < xSplit).length, columns.length),
    gridlines: sheet.showGridlines !== 0,
    truncatedFrom: maxRow > lastRow ? maxRow + 1 : null,
  };
}
