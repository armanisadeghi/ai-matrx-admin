/**
 * features/workbooks/univer-snapshot-rows.ts
 *
 * Snapshot → rows: read a Univer `IWorkbookData` snapshot back out as a plain
 * string grid. The missing half of the workbook round trip — `export-targets`
 * pushes rows INTO a workbook; this reads the (possibly user-edited) values
 * back OUT so features can offer "edit in the workbook, then import your
 * changes". Values only (formulas come back as their cached value); first
 * sheet by `sheetOrder` unless a sheet id is named. A number shown through a date format reads as
 * its ISO date (a spreadsheet keeps dates as day serials). Reusable — do not fork a per-feature
 * snapshot walker. Callers: the workbook's "Make this sheet a table" (features/workbooks/table-link).
 */

interface CellShape {
  v?: unknown;
  s?: unknown;
}

interface SheetShape {
  name?: string;
  /** Univer marks a hidden column/row `hd: 1` (a table link's Record ID column is one). */
  columnData?: Record<string, { hd?: number } | null | undefined>;
  rowData?: Record<string, { hd?: number } | null | undefined>;
  cellData?: Record<string, Record<string, CellShape | null | undefined>>;
}

interface SnapshotShape {
  sheetOrder?: string[];
  sheets?: Record<string, SheetShape>;
  styles?: Record<string, { n?: { pattern?: string } | null } | null>;
}

export interface SnapshotRows {
  sheetName: string;
  /** Dense rectangular grid, trailing empty rows/columns trimmed. */
  rows: string[][];
}

type Styles = SnapshotShape["styles"];

/** The number-format pattern a cell is shown through, if any. */
function patternOf(cell: CellShape | null | undefined, styles: Styles): string | null {
  const s = cell?.s;
  const style = typeof s === "string" ? styles?.[s] : s && typeof s === "object" ? (s as { n?: { pattern?: string } }) : null;
  const pattern = style?.n?.pattern;
  return typeof pattern === "string" ? pattern : null;
}

const DAY_MS = 86_400_000;
const SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

function cellText(cell: CellShape | null | undefined, styles?: Styles): string {
  const value = cell?.v;
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    const pattern = patternOf(cell, styles)?.replace(/"[^"]*"/g, "").toLowerCase() ?? "";
    if (/[dy]/.test(pattern)) {
      const iso = new Date(Math.round(SERIAL_EPOCH_MS + value * DAY_MS)).toISOString();
      return /h/.test(pattern) ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
    }
  }
  return String(value);
}

/**
 * Extract the first worksheet of a Univer workbook snapshot as a string grid.
 * Returns null when the value is not snapshot-shaped or has no sheets.
 * `skipHidden` leaves out hidden columns and rows: every read-only view (a share page, an agent's
 * read) passes it, so the table link's hidden Record ID column never reaches a reader.
 */
export function univerSnapshotToRows(snapshot: unknown, options: { sheetId?: string; skipHidden?: boolean } = {}): SnapshotRows | null {
  if (typeof snapshot !== "object" || snapshot === null) return null;
  const shape = snapshot as SnapshotShape;
  const sheets = shape.sheets ?? {};
  const styles = shape.styles;
  const firstId = options.sheetId
    ? sheets[options.sheetId]
      ? options.sheetId
      : undefined
    : (shape.sheetOrder?.find((id) => sheets[id]) ?? Object.keys(sheets)[0]);
  if (!firstId) return null;
  const sheet = sheets[firstId];
  const cellData = sheet?.cellData ?? {};

  let maxRow = -1;
  let maxCol = -1;
  for (const [rowKey, row] of Object.entries(cellData)) {
    const rowIndex = Number(rowKey);
    if (!Number.isInteger(rowIndex) || !row) continue;
    for (const [colKey, cell] of Object.entries(row)) {
      const colIndex = Number(colKey);
      if (!Number.isInteger(colIndex)) continue;
      if (cellText(cell) === "") continue;
      if (rowIndex > maxRow) maxRow = rowIndex;
      if (colIndex > maxCol) maxCol = colIndex;
    }
  }
  if (maxRow < 0 || maxCol < 0) {
    return { sheetName: sheet?.name ?? "Sheet1", rows: [] };
  }

  const hiddenCol = (c: number) => options.skipHidden === true && sheet?.columnData?.[String(c)]?.hd === 1;
  const hiddenRow = (r: number) => options.skipHidden === true && sheet?.rowData?.[String(r)]?.hd === 1;
  const rows: string[][] = [];
  for (let r = 0; r <= maxRow; r += 1) {
    if (hiddenRow(r)) continue;
    const row: string[] = [];
    const source = cellData[String(r)] ?? {};
    for (let c = 0; c <= maxCol; c += 1) {
      if (hiddenCol(c)) continue;
      row.push(cellText(source[String(c)], styles));
    }
    rows.push(row);
  }
  return { sheetName: sheet?.name ?? "Sheet1", rows };
}
