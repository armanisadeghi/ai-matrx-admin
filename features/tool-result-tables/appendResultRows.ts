/**
 * Add one Tool answer's rows to a table the person already chose: matched columns by header, the
 * answer's new columns added, and the rows deduped on the answer's key — a re-run updates what is
 * there instead of piling up copies. All writing is the data-tables engine (`appendToTable`).
 */
import { sanitizeFieldName } from "@ai-matrx/records/core";

import { appendToTable, type SaveToTableResult } from "@/features/data-tables/save-to-table";
import { reconcileColumns } from "@/features/data-tables/reconcile";
import { addChoicesToColumn, getTableMetadata } from "@/features/data-tables/service";
import { isServiceFailure, type TableMetadata } from "@/features/data-tables/types";
import type { TableField } from "@/features/data-tables/table-shapes";

import type { ResultRows } from "./rowsFromKind";

export type AppendOutcome = SaveToTableResult & { tableName: string | null };

export async function appendResultRows(tableId: string, described: ResultRows): Promise<AppendOutcome> {
  const meta = await getTableMetadata({ tableId });
  if (isServiceFailure(meta)) {
    return { success: false, error: meta.error, inserted: 0, updated: 0, skipped: 0, failed: 0, columnsAdded: 0, tableName: null };
  }
  const data = meta.data as TableMetadata;
  const fields = data.columns as unknown as TableField[];
  const rec = reconcileColumns(described.headers, fields);
  const added = await addMissingChoices(tableId, fields, rec.mapping, described);
  if (added) {
    return { success: false, error: added, inserted: 0, updated: 0, skipped: 0, failed: 0, columnsAdded: 0, tableName: data.table.table_name };
  }
  const identifierField = rec.mapping[described.keyHeader] ?? sanitizeFieldName(described.keyHeader);
  const result = await appendToTable({
    tableId,
    rows: rowsForColumns(described, rec.mapping, fields),
    mapping: rec.mapping,
    newColumns: rec.incomingOnly,
    dedupe: { identifierField, onDuplicate: "update" },
  });
  return { ...result, tableName: data.table.table_name };
}

type ChoiceFormat = { id?: string; options?: { choices?: { value?: string }[] } };

/**
 * A choice column only takes the words it lists, and a re-run of a Tool can bring a new one (a verdict the
 * first answer never had). The words are added to the column's choices first — the same door the paste's
 * "Add" uses — so the rows land instead of being refused. Returns a sentence when a column could not be widened.
 */
async function addMissingChoices(
  tableId: string,
  fields: TableField[],
  mapping: Record<string, string>,
  described: ResultRows,
): Promise<string | null> {
  for (const [header, fieldName] of Object.entries(mapping)) {
    const field = fields.find((f) => f.field_name === fieldName);
    const format = (field?.metadata as { format?: ChoiceFormat } | null | undefined)?.format;
    if (!field || !format || (format.id !== "choice" && format.id !== "multi_choice")) continue;
    const known = new Set((format.options?.choices ?? []).map((c) => String(c.value ?? "").toLowerCase()));
    const words = new Set<string>();
    for (const row of described.rows) {
      const cell = row[header];
      if (typeof cell !== "string") continue;
      for (const word of format.id === "multi_choice" ? cell.split(",").map((w) => w.trim()) : [cell.trim()]) {
        if (word && !known.has(word.toLowerCase())) words.add(word);
      }
    }
    if (words.size === 0) continue;
    const done = await addChoicesToColumn({ tableId, fieldId: field.id, words: [...words], format: format as never });
    if (isServiceFailure(done)) return done.error;
  }
  return null;
}

/**
 * Cells in the words the target column takes: a true/false answer going into a text or choice column (a
 * table first made from the answer's grid holds every cell as words) is written as "true" / "false", and
 * a number into a text column as its digits. Boolean and number columns keep the real value.
 */
export function rowsForColumns(described: ResultRows, mapping: Record<string, string>, fields: TableField[]): ResultRows["rows"] {
  const typeOf = new Map(
    fields.map((f) => {
      const format = (f.metadata as { format?: { id?: string } } | null | undefined)?.format?.id;
      return [f.field_name, format === "choice" || format === "multi_choice" ? "choice" : f.data_type] as const;
    }),
  );
  return described.rows.map((row) => {
    const out = { ...row };
    for (const [header, value] of Object.entries(row)) {
      const type = typeOf.get(mapping[header] ?? "");
      if (type === undefined || value === null) continue;
      if (typeof value === "boolean" && (type === "choice" || type !== "boolean")) out[header] = String(value);
      else if (typeof value === "number" && (type === "string" || type === "text" || type === "choice")) out[header] = String(value);
    }
    return out;
  });
}
