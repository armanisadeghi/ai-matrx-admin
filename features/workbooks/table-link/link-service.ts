/**
 * features/workbooks/table-link/link-service.ts — the link's reads and writes, and the three
 * actions that make or use one. Every table read and write goes through the data seam
 * (`features/data-tables/service.ts`); every workbook write through `workbook-service`; the link
 * itself is `udt_workbooks.metadata.table_links` (merged with `mergeJsonColumn`, never a
 * read-spread-write of our own). See `link-model.ts` for the link's shape and the sheet's rules.
 */
"use client";

import { mergeJsonColumn } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { createWorkbook, saveSnapshot } from "@/features/workbooks/workbook-service";
import {
  addChoicesToColumn,
  addTableColumn,
  bulkWrite,
  getCompleteTable,
  readRelationWords,
} from "@/features/data-tables/service";
import { inferDataType } from "@/features/data-tables/type-inference";
import { sanitizeFieldName } from "@/features/data-tables/field-name-key";
import { isBulkOpError, isServiceFailure, type BulkOp, type DatasetField } from "@/features/data-tables/types";

import {
  RECORD_ID_HEADER,
  buildLinkedWorkbook,
  linkedFieldFor,
  parseSheet,
  type LinkedField,
  type ParsedSheet,
  type TableForSheet,
  type TableLink,
} from "./link-model";
import type { ExtraColumn, ToTablePlan } from "./sync-plan";

export type LinkResult<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: unknown): { ok: false; error: string } => ({
  ok: false,
  error: error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong",
});

function randomId(prefix: string): string {
  const raw = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${raw}`;
}

// ─── the link on the workbook ────────────────────────────────────────────────

function linksIn(metadata: unknown): TableLink[] {
  const list = (metadata as { table_links?: unknown } | null)?.table_links;
  return Array.isArray(list) ? (list as TableLink[]).filter((l) => l && typeof l.table_id === "string" && typeof l.sheet_id === "string") : [];
}

type WorkbookMetaRow = { id: string; version: number; metadata: unknown };

export async function readLinks(workbookId: string): Promise<LinkResult<TableLink[]>> {
  const { data, error } = await supabase.schema("workbench").from("udt_workbooks").select("metadata").eq("id", workbookId).maybeSingle();
  if (error) return fail(error.message);
  return { ok: true, data: linksIn(data?.metadata) };
}

/** Write one sheet's link (replacing that sheet's earlier one), or drop it with `link: null`. */
export async function writeLink(workbookId: string, sheetId: string, link: TableLink | null): Promise<LinkResult<TableLink[]>> {
  const result = await mergeJsonColumn<WorkbookMetaRow>({
    fetchCurrent: () => supabase.schema("workbench").from("udt_workbooks").select("id, version, metadata").eq("id", workbookId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      const others = linksIn(current).filter((l) => l.sheet_id !== sheetId);
      return { ...current, table_links: link ? [...others, link] : others };
    },
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      supabase
        .schema("workbench")
        .from("udt_workbooks")
        .update({ metadata: value as never, version: nextVersion })
        .eq("id", workbookId)
        .eq("version", expectedVersion)
        .select("id, version, metadata")
        .maybeSingle(),
  });
  if (result.status === "saved") return { ok: true, data: linksIn(result.row.metadata) };
  if (result.status === "not_found") return fail("This workbook could not be found");
  if (result.status === "conflict") return fail("The workbook changed while saving its link; try again");
  return fail(result.error);
}

export interface LinkedWorkbook {
  workbookId: string;
  name: string;
  link: TableLink;
}

/** Every workbook this person can open that is linked to the table (the table side's read). */
export async function workbooksLinkedTo(tableId: string): Promise<LinkResult<LinkedWorkbook[]>> {
  const { data, error } = await supabase
    .schema("workbench")
    .from("udt_workbooks")
    .select("id, workbook_name, metadata, updated_at")
    .contains("metadata", { table_links: [{ table_id: tableId }] })
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return fail(error.message);
  const out: LinkedWorkbook[] = [];
  for (const row of data ?? []) {
    for (const link of linksIn(row.metadata)) {
      if (link.table_id === tableId) out.push({ workbookId: row.id, name: row.workbook_name, link });
    }
  }
  return { ok: true, data: out };
}

export async function readSnapshotById(snapshotId: string): Promise<LinkResult<unknown>> {
  const { data, error } = await supabase.schema("workbench").from("udt_workbook_snapshots").select("snapshot").eq("id", snapshotId).maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("The last synced version of this sheet is no longer available");
  return { ok: true, data: data.snapshot };
}

/** The sheet as it was at the last sync (null when the link has none). */
export async function readBaseline(link: TableLink): Promise<ParsedSheet | null> {
  if (!link.baseline_snapshot_id) return null;
  const snap = await readSnapshotById(link.baseline_snapshot_id);
  return snap.ok ? parseSheet(snap.data, link.sheet_id) : null;
}

// ─── the table, read for a sheet ─────────────────────────────────────────────

export interface TableRead extends TableForSheet {
  tableId: string;
  organizationId: string;
  columns: DatasetField[];
}

/** The ids of the related records a relation column's cells store (the words door answers by these). */
function relatedIds(rows: readonly { data: Record<string, unknown> }[], fieldName: string): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    const v = r.data[fieldName];
    for (const part of Array.isArray(v) ? v : [v]) if (typeof part === "string" && part.trim()) ids.add(part.trim());
  }
  return [...ids];
}

/** Every record and the schema, with relation words, as the sheet shows them. */
export async function readTableForSheet(tableId: string, only?: readonly LinkedField[]): Promise<LinkResult<TableRead>> {
  const complete = await getCompleteTable({ tableId });
  if (isServiceFailure(complete)) return fail(complete.error);
  const columns = complete.data.fields as unknown as DatasetField[];
  const rows = complete.data.rows.map((r) => ({ id: r.id, data: r.data }));
  const table = complete.data.table as { table_name?: string; organization_id?: string };
  const fields: LinkedField[] = only
    ? only.map((f) => {
        // A linked field keeps its header; its kind and choices follow the column as it is now.
        const column = columns.find((c) => c.field_name === f.field_name);
        if (!column) return f;
        return { ...linkedFieldFor(column, rows.slice(0, 50).map((r) => r.data[f.field_name])), header: f.header };
      })
    : columns.map((c) => linkedFieldFor(c, rows.slice(0, 50).map((r) => r.data[c.field_name])));
  const display: Record<string, Map<string, string>> = {};
  for (const f of fields) {
    const column = columns.find((c) => c.field_name === f.field_name);
    const formatId = (column?.metadata as { format?: { id?: string } } | null)?.format?.id;
    if (f.kind !== "readonly" || (formatId !== "relation" && formatId !== "person") || rows.length === 0) continue;
    display[f.field_name] = await readRelationWords({ tableId, fieldName: f.field_name, rowIds: relatedIds(rows, f.field_name) });
  }
  return {
    ok: true,
    data: {
      tableId,
      organizationId: table.organization_id ?? "",
      name: table.table_name?.trim() || "Table",
      columns,
      fields,
      rows,
      display,
    },
  };
}

// ─── action 1: open a table as a linked workbook ─────────────────────────────

/**
 * A row-level-security refusal on the workbook insert — the person may not make workbooks in that
 * organization (a guest the table was shared with, not a member of the table's organization).
 */
export function isWorkbookInsertRefused(error: string): boolean {
  return /row-level security/i.test(error);
}

/**
 * THE WORKBOOK LIVES WHERE ITS MAKER MAY MAKE ONE. A member of the table's organization gets it
 * there, beside the table. Someone the table was shared WITH (an Editor guest, not a member) may
 * not create rows in that organization, and that insert used to answer the raw
 * `new row violates row-level security policy for table "udt_workbooks"`; their copy now goes to
 * their own home organization — the link still names the table, which their share lets them read.
 */
export async function createLinkedWorkbook(name: string, tableOrganizationId: string): ReturnType<typeof createWorkbook> {
  const args = { name, description: "Linked to a table", source: "created" as const };
  const inTableOrg = await createWorkbook({ ...args, organizationId: tableOrganizationId });
  if (!isServiceFailure(inTableOrg) || !isWorkbookInsertRefused(inTableOrg.error)) return inTableOrg;
  // EVERY ITEM HAS ONE HOME SCOPE (Arman, 2026-10-10): the guest's copy goes to their own home organization —
  // the one the load ladder answers from their account (last active → start-up → first), waited for, never
  // a peek that reads null while the ladder is still answering (MEMBER-DEFECTS-4 item 3).
  let organizationId: string;
  try {
    organizationId = await ensureOrgId(null);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Your organization could not be found." };
  }
  return createWorkbook({ ...args, organizationId });
}

export async function openTableAsWorkbook(tableId: string): Promise<LinkResult<{ workbookId: string; href: string }>> {
  try {
    const table = await readTableForSheet(tableId);
    if (!table.ok) return table;
    if (!table.data.organizationId) return fail("This table's workspace could not be found");
    const created = await createLinkedWorkbook(table.data.name, table.data.organizationId);
    if (isServiceFailure(created)) return fail(created.error);
    const workbookId = created.data.id;
    const sheetId = randomId("sheet").slice(0, 20);
    const snapshot = buildLinkedWorkbook(table.data, { workbookId: randomId("wb"), sheetId });
    const saved = await saveSnapshot({ workbookId, snapshot, origin: "imported", label: "Linked to table" });
    if (isServiceFailure(saved)) return fail(`The workbook was made but its sheet could not be saved: ${saved.error}`);
    const now = new Date().toISOString();
    const linked = await writeLink(workbookId, sheetId, {
      table_id: tableId,
      organization_id: table.data.organizationId,
      sheet_id: sheetId,
      fields: table.data.fields,
      baseline_snapshot_id: saved.data.id,
      linked_at: now,
      last_synced_at: now,
      last_sync_direction: "to_sheet",
    });
    if (!linked.ok) return fail(`The workbook was made but could not be linked: ${linked.error}`);
    return { ok: true, data: { workbookId, href: `/workbooks/${workbookId}` } };
  } catch (e) {
    return fail(e);
  }
}

// ─── action 2: apply a sheet → table plan ────────────────────────────────────

export interface PlanChoice {
  added: boolean;
  changed: boolean;
  removed: boolean;
  /** Changes where both sides moved: take the sheet's value. */
  conflicts: boolean;
}

export interface AppliedToTable {
  /** New records, by 0-based sheet row, so the sheet can carry their ids. */
  newIds: Array<{ row: number; id: string }>;
  counts: { added: number; changed: number; removed: number };
  refused: string[];
}

export async function applyPlanToTable(tableId: string, plan: ToTablePlan, choice: PlanChoice): Promise<LinkResult<AppliedToTable>> {
  const ops: BulkOp[] = [];
  const addRows: number[] = [];
  if (choice.added) {
    for (const add of plan.added) {
      ops.push({ op: "insert", data: add.values });
      addRows.push(add.row - 1);
    }
  }
  let changed = 0;
  if (choice.changed) {
    for (const row of plan.changed) {
      const patch: Record<string, unknown> = {};
      for (const c of row.changes) if (!c.conflict || choice.conflicts) patch[c.field_name] = c.to;
      if (Object.keys(patch).length === 0) continue;
      ops.push({ op: "merge", row_id: row.id, data: patch });
      changed += 1;
    }
  }
  if (choice.removed) for (const r of plan.removed) ops.push({ op: "delete", row_id: r.id });
  if (ops.length === 0) return { ok: true, data: { newIds: [], counts: { added: 0, changed: 0, removed: 0 }, refused: [] } };

  const written = await bulkWrite({ tableId, operations: ops });
  if (isServiceFailure(written)) return fail(written.error);
  const newIds: AppliedToTable["newIds"] = [];
  const refused: string[] = [];
  written.data.results.forEach((result, i) => {
    if (isBulkOpError(result)) {
      refused.push(result.message ?? `${result.error}: ${result.row_id}`);
      return;
    }
    if (i < addRows.length) newIds.push({ row: addRows[i], id: result.id });
  });
  return {
    ok: true,
    data: {
      newIds,
      counts: { added: choice.added ? plan.added.length : 0, changed, removed: choice.removed ? plan.removed.length : 0 },
      refused,
    },
  };
}

/** Words the person chose to add to a Choice column's list, before the rows that use them are written. */
export async function addWordsToChoices(tableId: string, words: ReadonlyMap<string, string[]>): Promise<LinkResult<number>> {
  if ([...words.values()].every((w) => w.length === 0)) return { ok: true, data: 0 };
  const table = await readTableForSheet(tableId);
  if (!table.ok) return table;
  let added = 0;
  for (const [fieldName, list] of words) {
    if (list.length === 0) continue;
    const column = table.data.columns.find((c) => c.field_name === fieldName);
    const id = (column as { id?: string } | undefined)?.id;
    if (!column || !id) return fail(`The "${fieldName}" column could not be found to add its choices`);
    const format = (column.metadata as { format?: unknown } | null)?.format as never;
    const done = await addChoicesToColumn({ tableId, fieldId: id, words: list, format });
    if (isServiceFailure(done)) return fail(done.error);
    added += list.length;
  }
  return { ok: true, data: added };
}

/** Make the sheet columns the person picked into fields; their values ride the next update. */
export async function addColumnsAsFields(
  tableId: string,
  sheet: ParsedSheet,
  extras: readonly ExtraColumn[],
  existing: readonly LinkedField[],
): Promise<LinkResult<LinkedField[]>> {
  const table = await readTableForSheet(tableId);
  if (!table.ok) return table;
  const taken = new Set(table.data.columns.map((c) => c.field_name));
  const added: LinkedField[] = [];
  for (const extra of extras) {
    if (extra.header === RECORD_ID_HEADER) continue;
    const sample = sheet.rows.map((r) => r.cells[extra.col]?.v).filter((v) => v !== null && v !== undefined && v !== "");
    const types = new Set(sample.slice(0, 50).map((v) => inferDataType(v)));
    const dataType = types.size === 1 ? [...types][0] : types.size === 2 && types.has("integer") && types.has("number") ? "number" : "string";
    let key = sanitizeFieldName(extra.header) || `column_${extra.letter.toLowerCase()}`;
    while (taken.has(key)) key = `${key}_2`;
    taken.add(key);
    const made = await addTableColumn({ tableId, fieldName: key, displayName: extra.header, dataType, isRequired: false });
    if (!made.success) return fail(made.error ?? `Could not add "${extra.header}"`);
    added.push(linkedFieldFor({ field_name: key, display_name: extra.header, data_type: dataType as DatasetField["data_type"], metadata: {} }));
  }
  return { ok: true, data: [...existing, ...added] };
}
