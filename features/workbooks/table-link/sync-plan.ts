/**
 * features/workbooks/table-link/sync-plan.ts — what an update would do, before it does it. PURE.
 *
 * Both directions are THREE-WAY: the sheet now, the table now, and the BASELINE — the sheet as it
 * was at the last sync (a workbook snapshot id kept on the link). A value that moved on one side
 * only is that side's edit; a value that moved on both is a conflict, shown, defaulting to the side
 * the person is updating FROM. Without a baseline (a link made before any sync) the sheet and the
 * table are compared directly.
 *
 *   planToTable  — sheet → table: rows added (no id), fields changed, rows removed (in the baseline,
 *                  gone from the sheet). Table edits the sheet never saw are KEPT, never reverted.
 *   planToSheet  — table → sheet: cells to write (in place, matched by id), new records appended,
 *                  rows whose record is gone cleared. Sheet edits the table never saw are KEPT.
 *
 * The rules a sheet must keep (the header row and the id column) are checked first; what breaks
 * them is named — which column, what was expected, what is there now — so the dialog can offer the
 * fix or a fresh export. Columns the link does not know are listed, never touched.
 */

import {
  RECORD_ID_HEADER,
  bodyCell,
  columnLetter,
  displayText,
  sameValue,
  valueFromCell,
  type LinkedField,
  type ParsedSheet,
  type SheetCell,
  type TableLink,
} from "./link-model";

export type SheetIssue =
  | { kind: "missing_id_column" }
  | { kind: "missing_header"; field_name: string; header: string; column: string | null; found: string | null; col: number | null }
  | { kind: "duplicate_header"; header: string; columns: string[] }
  | { kind: "duplicate_id"; id: string; rows: number[] }
  | { kind: "unknown_id"; id: string; row: number };

export interface ExtraColumn {
  col: number;
  letter: string;
  header: string;
}

export interface Located {
  idCol: number | null;
  columns: Map<string, number>;
  extraColumns: ExtraColumn[];
  issues: SheetIssue[];
}

const norm = (h: string) => h.trim().toLowerCase();

/** Find each linked field's column by its header; name every broken rule. */
export function locateColumns(sheet: ParsedSheet, link: Pick<TableLink, "fields">, baseline?: ParsedSheet | null): Located {
  const issues: SheetIssue[] = [];
  const byHeader = new Map<string, number[]>();
  for (const [col, header] of sheet.headers) {
    const key = norm(header);
    byHeader.set(key, [...(byHeader.get(key) ?? []), col]);
  }
  const idCols = byHeader.get(norm(RECORD_ID_HEADER)) ?? [];
  const idCol = idCols.length > 0 ? idCols[0] : null;
  if (idCol === null) issues.push({ kind: "missing_id_column" });

  const columns = new Map<string, number>();
  const baselineCol = (header: string): number | null => {
    if (!baseline) return null;
    for (const [col, h] of baseline.headers) if (norm(h) === norm(header)) return col;
    return null;
  };
  for (const field of link.fields) {
    const found = byHeader.get(norm(field.header)) ?? [];
    if (found.length === 0) {
      const was = baselineCol(field.header);
      issues.push({
        kind: "missing_header",
        field_name: field.field_name,
        header: field.header,
        col: was,
        column: was === null ? null : columnLetter(was),
        found: was === null ? null : sheet.headers.get(was) ?? null,
      });
      continue;
    }
    if (found.length > 1) issues.push({ kind: "duplicate_header", header: field.header, columns: found.map(columnLetter) });
    columns.set(field.field_name, found[0]);
  }
  const known = new Set<number>([...columns.values(), ...(idCol === null ? [] : [idCol])]);
  const extraColumns: ExtraColumn[] = [...sheet.headers.entries()]
    .filter(([col]) => !known.has(col))
    .filter(([col, header]) => !(norm(header) === norm(RECORD_ID_HEADER) && col !== idCol))
    .map(([col, header]) => ({ col, letter: columnLetter(col), header }))
    .sort((a, b) => a.col - b.col);
  return { idCol, columns, extraColumns, issues };
}

// ─── shared pieces ────────────────────────────────────────────────────────────

export interface TableRowLike {
  id: string;
  data: Record<string, unknown>;
}

export interface FieldChange {
  field_name: string;
  header: string;
  from: unknown;
  to: unknown;
  /** Both sides moved since the last sync. */
  conflict: boolean;
  /** The sheet's value does not fit the field (the store will judge it). */
  problem?: string;
}

export interface RowChange {
  id: string;
  /** 1-based sheet row, as a person reads it. */
  row: number | null;
  label: string;
  changes: FieldChange[];
}

export interface RowAdd {
  row: number;
  label: string;
  values: Record<string, unknown>;
  problems: Array<{ header: string; problem: string }>;
}

export interface RowRemove {
  id: string;
  row: number | null;
  label: string;
}

function writable(link: Pick<TableLink, "fields">): LinkedField[] {
  return link.fields.filter((f) => f.kind !== "readonly");
}

function labelFrom(link: Pick<TableLink, "fields">, values: Record<string, unknown>, fallback: string): string {
  for (const f of link.fields) {
    if (f.kind !== "text" && f.kind !== "choice") continue;
    const text = displayText(values[f.field_name]).trim();
    if (text) return text.length > 48 ? `${text.slice(0, 47)}…` : text;
  }
  return fallback;
}

function readRow(fields: readonly LinkedField[], columns: Map<string, number>, cells: ParsedSheet["rows"][number]["cells"]) {
  const values: Record<string, unknown> = {};
  const problems: Record<string, string> = {};
  for (const f of fields) {
    const col = columns.get(f.field_name);
    if (col === undefined) continue;
    const read = valueFromCell(f, cells[col]);
    values[f.field_name] = read.value;
    if (!read.ok) problems[f.field_name] = read.problem;
    else if (f.kind === "choice" && f.choices && f.choices.length > 0 && typeof read.value === "string" && read.value && !f.choices.includes(read.value)) {
      problems[f.field_name] = "Not in the list";
    }
  }
  return { values, problems };
}

function baselineIndex(link: Pick<TableLink, "fields">, baseline: ParsedSheet | null | undefined) {
  if (!baseline) return null;
  const located = locateColumns(baseline, link);
  const map = new Map<string, Record<string, unknown>>();
  if (located.idCol === null) return map;
  for (const row of baseline.rows) {
    if (!row.id || map.has(row.id)) continue;
    map.set(row.id, readRow(link.fields, located.columns, row.cells).values);
  }
  return map;
}

function hasAnyValue(fields: readonly LinkedField[], values: Record<string, unknown>): boolean {
  return fields.some((f) => {
    const v = values[f.field_name];
    if (v === null || v === undefined || v === "" || v === false) return false;
    return !(Array.isArray(v) && v.length === 0);
  });
}

// ─── sheet → table ────────────────────────────────────────────────────────────

export interface ToTablePlan {
  located: Located;
  issues: SheetIssue[];
  /** No id column: nothing can be matched, so nothing is applied until it is fixed. */
  blocking: boolean;
  added: RowAdd[];
  changed: RowChange[];
  removed: RowRemove[];
  /** Fields the table changed since the sync and the sheet did not: kept as the table has them. */
  tableNewer: number;
  /** Edits typed into read-only columns (relations, formulas…): ignored. */
  readonlyEdits: number;
}

export function planToTable(args: {
  sheet: ParsedSheet;
  baseline: ParsedSheet | null;
  link: Pick<TableLink, "fields">;
  tableRows: readonly TableRowLike[];
}): ToTablePlan {
  const { sheet, link, tableRows } = args;
  const located = locateColumns(sheet, link, args.baseline);
  const issues = [...located.issues];
  const plan: ToTablePlan = { located, issues, blocking: located.idCol === null, added: [], changed: [], removed: [], tableNewer: 0, readonlyEdits: 0 };
  if (plan.blocking) return plan;

  const fields = writable(link);
  const readonly = link.fields.filter((f) => f.kind === "readonly");
  const table = new Map(tableRows.map((r) => [r.id, r]));
  const base = baselineIndex(link, args.baseline);
  const seen = new Map<string, number[]>();

  for (const row of sheet.rows) {
    const { values, problems } = readRow(link.fields, located.columns, row.cells);
    const id = row.id;
    const rowNo = row.row + 1;
    const duplicate = id ? (seen.get(id)?.length ?? 0) > 0 : false;
    if (id) seen.set(id, [...(seen.get(id) ?? []), rowNo]);

    if (!id || duplicate) {
      // A row with no id is a new record; a copied row (its id already used above) is one too.
      if (!hasAnyValue(fields, values)) continue;
      plan.added.push({
        row: rowNo,
        label: labelFrom(link, values, `Row ${rowNo}`),
        values: Object.fromEntries(fields.filter((f) => located.columns.has(f.field_name)).map((f) => [f.field_name, values[f.field_name]])),
        problems: Object.entries(problems).map(([name, problem]) => ({ header: link.fields.find((f) => f.field_name === name)?.header ?? name, problem })),
      });
      continue;
    }
    const current = table.get(id);
    if (!current) {
      // In the baseline but gone from the table: removed there since the sync — stays removed.
      if (base?.has(id)) continue;
      issues.push({ kind: "unknown_id", id, row: rowNo });
      continue;
    }
    const before = base?.get(id);
    const changes: FieldChange[] = [];
    for (const f of fields) {
      if (!located.columns.has(f.field_name)) continue;
      const sheetValue = values[f.field_name];
      const tableValue = current.data[f.field_name];
      if (sameValue(f, sheetValue, tableValue)) continue;
      if (before && sameValue(f, sheetValue, before[f.field_name])) {
        plan.tableNewer += 1;
        continue;
      }
      const conflict = !!before && !sameValue(f, tableValue, before[f.field_name]);
      changes.push({ field_name: f.field_name, header: f.header, from: tableValue ?? null, to: sheetValue, conflict, ...(problems[f.field_name] ? { problem: problems[f.field_name] } : {}) });
    }
    for (const f of readonly) {
      if (!located.columns.has(f.field_name)) continue;
      const was = before?.[f.field_name];
      if (before && !sameValue(f, values[f.field_name], was)) plan.readonlyEdits += 1;
    }
    if (changes.length > 0) plan.changed.push({ id, row: rowNo, label: labelFrom(link, { ...current.data, ...values }, `Row ${rowNo}`), changes });
  }
  for (const [id, rows] of seen) if (rows.length > 1) issues.push({ kind: "duplicate_id", id, rows });

  if (base) {
    for (const id of base.keys()) {
      if (seen.has(id)) continue;
      const current = table.get(id);
      if (!current) continue;
      plan.removed.push({ id, row: null, label: labelFrom(link, current.data, "Record") });
    }
  }
  return plan;
}

// ─── table → sheet ────────────────────────────────────────────────────────────

export interface CellWrite {
  row: number;
  col: number;
  cell: SheetCell | null;
}

export interface ToSheetPlan {
  located: Located;
  issues: SheetIssue[];
  blocking: boolean;
  writes: CellWrite[];
  appended: RowRemove[];
  updated: RowChange[];
  cleared: RowRemove[];
  /** Sheet edits the table has not taken yet: kept in the sheet. */
  sheetEditsKept: number;
  /** Sheet rows with no record yet (typed in the sheet): kept. */
  sheetOnlyRows: number;
}

export function planToSheet(args: {
  sheet: ParsedSheet;
  baseline: ParsedSheet | null;
  link: Pick<TableLink, "fields">;
  tableRows: readonly TableRowLike[];
  display?: Record<string, Map<string, string>>;
}): ToSheetPlan {
  const { sheet, link, tableRows, display } = args;
  const located = locateColumns(sheet, link, args.baseline);
  const plan: ToSheetPlan = {
    located,
    issues: [...located.issues],
    blocking: located.idCol === null,
    writes: [],
    appended: [],
    updated: [],
    cleared: [],
    sheetEditsKept: 0,
    sheetOnlyRows: 0,
  };
  if (plan.blocking || located.idCol === null) return plan;
  const idCol = located.idCol;

  const base = baselineIndex(link, args.baseline);
  const table = new Map(tableRows.map((r) => [r.id, r]));
  const placed = new Set<string>();
  const shown = (f: LinkedField, row: TableRowLike) => display?.[f.field_name]?.get(row.id) ?? null;

  for (const row of sheet.rows) {
    if (!row.id) {
      plan.sheetOnlyRows += 1;
      continue;
    }
    if (placed.has(row.id)) continue;
    placed.add(row.id);
    const current = table.get(row.id);
    const rowNo = row.row + 1;
    if (!current) {
      // The record is gone (archived or deleted in the table): its linked cells are cleared.
      const { values } = readRow(link.fields, located.columns, row.cells);
      plan.cleared.push({ id: row.id, row: rowNo, label: labelFrom(link, values, `Row ${rowNo}`) });
      for (const col of [...located.columns.values(), idCol]) plan.writes.push({ row: row.row, col, cell: null });
      continue;
    }
    const { values } = readRow(link.fields, located.columns, row.cells);
    const before = base?.get(row.id);
    const changes: FieldChange[] = [];
    for (const f of link.fields) {
      const col = located.columns.get(f.field_name);
      if (col === undefined) continue;
      const tableValue = f.kind === "readonly" ? (shown(f, current) ?? displayText(current.data[f.field_name])) : current.data[f.field_name];
      if (sameValue(f, values[f.field_name], tableValue)) continue;
      if (f.kind !== "readonly" && before && sameValue(f, tableValue, before[f.field_name])) {
        plan.sheetEditsKept += 1;
        continue;
      }
      const conflict = f.kind !== "readonly" && !!before && !sameValue(f, values[f.field_name], before[f.field_name]);
      changes.push({ field_name: f.field_name, header: f.header, from: values[f.field_name] ?? null, to: tableValue ?? null, conflict });
      plan.writes.push({ row: row.row, col, cell: bodyCell(f, current.data[f.field_name], shown(f, current)) });
    }
    if (changes.length > 0) plan.updated.push({ id: row.id, row: rowNo, label: labelFrom(link, current.data, `Row ${rowNo}`), changes });
  }

  // New records (and records whose row was deleted from the sheet) go below the last used row.
  let next = sheet.rows.reduce((m, r) => Math.max(m, r.row), 0) + 1;
  for (const record of tableRows) {
    if (placed.has(record.id)) continue;
    for (const f of link.fields) {
      const col = located.columns.get(f.field_name);
      if (col === undefined) continue;
      const cell = bodyCell(f, record.data[f.field_name], shown(f, record));
      if (cell) plan.writes.push({ row: next, col, cell });
    }
    plan.writes.push({ row: next, col: idCol, cell: { v: record.id, t: 1 } });
    plan.appended.push({ id: record.id, row: next + 1, label: labelFrom(link, record.data, "Record") });
    next += 1;
  }
  return plan;
}

/** One line per issue, naming what and where — the dialog's words. */
export function describeIssue(issue: SheetIssue): string {
  switch (issue.kind) {
    case "missing_id_column":
      return `The hidden "${RECORD_ID_HEADER}" column is gone, so rows can't be matched`;
    case "missing_header":
      return issue.column && issue.found
        ? `Column ${issue.column} was "${issue.header}", now "${issue.found}"`
        : issue.column
          ? `Column ${issue.column} "${issue.header}" is empty or removed`
          : `No "${issue.header}" column in row 1`;
    case "duplicate_header":
      return `"${issue.header}" heads columns ${issue.columns.join(", ")}; using ${issue.columns[0]}`;
    case "duplicate_id":
      return `Rows ${issue.rows.join(", ")} share one record id; later copies become new records`;
    case "unknown_id":
      return `Row ${issue.row} names a record this table doesn't have; skipped`;
  }
}
