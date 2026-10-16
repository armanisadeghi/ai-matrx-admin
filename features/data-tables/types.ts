/**
 * Domain types for the data-tables system: the workbook and document rows (generated Supabase
 * types), and the GRID's shapes — a table, its columns, its rows and a row's versions — which the
 * data seam builds from the record store (`data-source/record-store.ts`). Extend this file rather
 * than defining ad-hoc shapes elsewhere.
 */
import type { RecordsError } from "@ai-matrx/records";
import type { BulkOpResult, DatasetField, DatasetRow } from "@ai-matrx/records/core";
import type { Database, Json } from "@/types/database.types";
import type { FieldFormatConfig } from "@ai-matrx/design-system/field-formats";

type T = Database["workbench"]["Tables"];
type E = Database["public"]["Enums"];

// ─── Row shapes (from Supabase) ──────────────────────────────────────────────

export type WorkbookInsert = T["udt_workbooks"]["Insert"];
export type WorkbookUpdate = T["udt_workbooks"]["Update"];

export type WorkbookSnapshotInsert = T["udt_workbook_snapshots"]["Insert"];

// ─── documents (mirror of workbooks; Univer preset-docs-core surface) ────────

export type DocumentInsert = T["udt_documents"]["Insert"];
export type DocumentUpdate = T["udt_documents"]["Update"];

export type DocumentSnapshotInsert = T["udt_document_snapshots"]["Insert"];

// ─── The grid's shapes (built by the data seam from the record store) ────────

/** A table as the grid reads it. */
export type Dataset = {
  id: string;
  table_name: string;
  description: string | null;
  organization_id: string;
  user_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  is_public: boolean;
  metadata: Json;
  custom_fields: Json;
  row_ordering_config: Json | null;
  validation_mode: string;
  version: number;
  project_id: string | null;
  task_id: string | null;
  template_id: string | null;
  template_version: number | null;
  published_to_web: boolean;
  published_to_web_at: string | null;
  published_to_web_by: string | null;
  shown_to: Database["platform"]["Enums"]["shown_to"] | null;
  visibility: Database["platform"]["Enums"]["visibility"];
};

/** One version of a row, rebuilt from the store's history (`custom.record_history`). */
export type RowVersion = {
  id: number;
  row_id: string;
  table_id: string;
  change_kind: E["row_change_kind"];
  changed_at: string;
  changed_by: string | null;
  data: Json | null;
  prior_data: Json | null;
  reason: string | null;
  custom_fields: Json;
};

/** A table's schema and size with NO row data. */
export type TableMetadata = {
  /** The table (carries row_ordering_config). */
  table: Dataset;
  /** Its columns, ordered by `field_order`. */
  columns: DatasetField[];
  /** A real count, not the length of a materialized row array. */
  row_count: number;
};

// ─── Enums ───────────────────────────────────────────────────────────────────

export type FieldDataType = E["field_data_type"];
export type RowChangeKind = E["row_change_kind"];
export type WorkbookSource = E["workbook_source"];
export type PermissionLevel = E["permission_level"];

export const FIELD_DATA_TYPES: readonly FieldDataType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
  "json",
  "array",
] as const;

// ─── Bulk-write op shapes (the seam's `bulkWrite`) ──────────────────────────

// ─── Moved to their owners (re-exported so there is ONE definition) ──────────
// Table logic belongs to `@ai-matrx/records` (/core, and its light /door-call for the helpers a shell
// narrows with); the snapshot-origin unions to `@ai-matrx/office/core`.
export { describeBulkFailures, isBulkOpError, isServiceFailure } from "@ai-matrx/records/door-call";
export type {
  BulkCellOp,
  BulkDeleteOp,
  BulkInsertOp,
  BulkMergeOp,
  BulkOp,
  BulkOpError,
  BulkOpResult,
  BulkUpdateOp,
  BulkWriteResponse,
  DatasetField,
  DatasetRow,
  ServiceErr,
  ServiceOk,
  ServiceResult,
} from "@ai-matrx/records/core";
export type { DocumentSnapshotOrigin, WorkbookSnapshotOrigin } from "@ai-matrx/office/core";


// ─── Type-change response ────────────────────────────────────────────────────

export type ChangeFieldTypeStrategy = "cast_or_null" | "cast_or_skip";

export type ChangeFieldTypeResponse = {
  field_id: string;
  new_type: FieldDataType;
  strategy: ChangeFieldTypeStrategy;
  rows_rewritten: number;
  rows_skipped: number;
  rows_total: number;
  /**
   * How many values could NOT become the new type and were emptied from the
   * grid. Every one of them is in that row's history under `history_reason`,
   * written in the same transaction that emptied the cell — the type change
   * refuses outright rather than empty a cell whose only copy would be lost
   * (DD-244). A screen that shows a type-change result MUST show this number
   * and where the values went.
   */
  values_moved_to_history: number;
  /** The reason stamped on those history rows, e.g. `type_change:string→integer`. */
  history_reason: string;
};

// ─── Validation modes ────────────────────────────────────────────────────────

export type ValidationMode = "permissive" | "strict";

// ─── Service result envelope (matches existing convention) ───────────────────

// ─── Column shape (column facets / the table profile) ───────────────────────
//
// THE COLUMN KNOWS ITSELF. One shape, two granularities: `ColumnFacets` answers
// "what is in THIS column" and `TableProfile` answers it for every column at
// once. The value picker, the choice-format option seeding, and the column
// profile panel are all consumers of this one answer — none of them may count
// distinct values in the browser again.

/** One distinct value of a column and how many rows carry it. */
export type ColumnFacetValue = {
  value: string;
  count: number;
};

export type ColumnFacets = {
  table_id: string;
  field_name: string;
  /** Rows considered (after the active global search, if any). */
  total_rows: number;
  /** Rows whose cell is non-empty. */
  filled: number;
  /** Rows whose cell is null or whitespace-only — a real filter target. */
  blank: number;
  /** Total distinct non-empty values across EVERY row, not just `values`. */
  distinct_count: number;
  /** Longest value; a caller refuses a picker on a column of long prose. */
  max_length: number;
  /** Distinct values too long (>300 chars) to offer as options. */
  unlistable: number;
  limit: number;
  /** True when `values` does not carry every listable distinct value. */
  truncated: boolean;
  /** Top values by frequency, descending. */
  values: ColumnFacetValue[];
};

/**
 * Per-column evidence from the table profile (`getTableProfile`).
 *
 * The `looks_*` fields are COUNTS, never verdicts — "19 of 20 values are URLs"
 * is a different situation from "20 of 20", and only the caller knows which one
 * is worth acting on.
 */
export type ProfiledColumn = {
  field_name: string;
  display_name: string;
  data_type: FieldDataType;
  is_required: boolean;
  /** The column's declared display format, or null when it has none. */
  format: FieldFormatConfig | null;
  filled: number;
  blank: number;
  distinct_count: number;
  max_length: number;
  looks_numeric: number;
  looks_url: number;
  looks_email: number;
  looks_bool: number;
  top_values: ColumnFacetValue[];
};

export type TableProfile = {
  table_id: string;
  total_rows: number;
  columns: ProfiledColumn[];
};
