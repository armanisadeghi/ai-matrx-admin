/**
 * Add one Tool answer's rows to a table the person already chose: matched columns by header, the
 * answer's new columns added, and the rows deduped on the answer's key — a re-run updates what is
 * there instead of piling up copies. All writing is the data-tables engine (`appendToTable`).
 */
import { sanitizeFieldName } from "@ai-matrx/records/core";

import { appendToTable, type SaveToTableResult } from "@/features/data-tables/save-to-table";
import { reconcileColumns } from "@/features/data-tables/reconcile";
import { getTableMetadata } from "@/features/data-tables/service";
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
  const identifierField = rec.mapping[described.keyHeader] ?? sanitizeFieldName(described.keyHeader);
  const result = await appendToTable({
    tableId,
    rows: described.rows,
    mapping: rec.mapping,
    newColumns: rec.incomingOnly,
    dedupe: { identifierField, onDuplicate: "update" },
  });
  return { ...result, tableName: data.table.table_name };
}
