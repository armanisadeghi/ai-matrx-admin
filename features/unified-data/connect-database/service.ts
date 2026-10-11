// features/unified-data/connect-database/service.ts — LANE VISION-REACH, wave 3.
//
// The three server calls behind "Connect a database" (aidream `/external-databases`, router
// aidream/api/routers/external_databases.py). The server tests the connection, lists what it may
// read, keeps the connection string SEALED in the organization's vault, and lands one picked
// table as a Synced custom table through `custom.table_sync`. 🚨 The connection string goes UP in
// the body of `inspect` / `connect` (the person typed it) and NOTHING sent back ever carries it;
// never put it in a URL, a log line, an error or any state that outlives the form.

import { postJson } from "@/lib/python-client";

export interface OutsideColumn {
  name: string;
  type: string;
}

export interface OutsideTable {
  schema_name: string;
  name: string;
  columns: OutsideColumn[];
  key: string[];
  row_estimate: number;
}

export interface InspectAnswer {
  label: string;
  tables: OutsideTable[];
}

export interface SyncAnswer {
  table_id: string;
  created: boolean;
  rows_inserted: number;
  rows_updated: number;
  rows_archived: number;
  /** Rows archived here that the outside table still has: Refresh brought them back. */
  rows_restored: number;
  /** Live rows in the synced table after this sync. */
  rows_total: number;
  /** What the sync could not reconcile, one sentence each. */
  warnings: string[];
  synced_at: string;
}

/** Test a connection string and list the tables it may read. The server stores nothing. */
export async function inspectDatabase(organizationId: string, connectionString: string): Promise<InspectAnswer> {
  const { data } = await postJson<InspectAnswer>(
    "/external-databases/inspect",
    { organization_id: organizationId, connection_string: connectionString },
    { organizationId },
  );
  return data;
}

/** One outside table becomes a Synced table in this organization. */
export async function connectTable(
  organizationId: string,
  connectionString: string,
  table: { schema_name: string; name: string },
): Promise<SyncAnswer> {
  const { data } = await postJson<SyncAnswer>(
    "/external-databases/tables",
    {
      organization_id: organizationId,
      connection_string: connectionString,
      schema_name: table.schema_name,
      table_name: table.name,
    },
    { organizationId },
  );
  return data;
}

/** Re-read the outside table behind a Synced table. */
export async function refreshSyncedTable(organizationId: string, tableId: string): Promise<SyncAnswer> {
  const { data } = await postJson<SyncAnswer>(
    "/external-databases/refresh",
    { organization_id: organizationId, table_id: tableId },
    { organizationId },
  );
  return data;
}

/** The provider word `custom.table_sync` keys an outside-database table on. */
export const OUTSIDE_DATABASE_PROVIDER = "postgres";

/** Where the Connect a database page lives. */
export const CONNECT_DATABASE_PATH = "/data/connect";

// ── LANE SYNC-AIRTABLE (2026-10-10): every synced table, not only outside databases ──────────────
// aidream `/synced-tables` (aidream/services/synced_tables). A Google Sheets link shared "anyone with
// the link" or any https CSV link becomes a synced table; ONE refresh door re-reads whatever a synced
// table comes from (sheet, CSV, outside database, another table's view).

export type SyncAutoRefresh = "off" | "hourly" | "daily" | "on_change";

/** A Google Sheets / CSV link becomes a synced table in this organization. */
export async function connectSyncedLink(
  organizationId: string,
  input: {
    url: string;
    headerRow?: number;
    tableName?: string;
    autoRefresh?: "off" | "hourly" | "daily";
    mapping?: Record<string, ColumnPick>;
  },
): Promise<SyncAnswer> {
  const { data } = await postJson<SyncAnswer>(
    "/synced-tables/link",
    {
      organization_id: organizationId,
      url: input.url,
      header_row: input.headerRow ?? 1,
      table_name: input.tableName || null,
      auto_refresh: input.autoRefresh ?? "off",
      mapping: input.mapping && Object.keys(input.mapping).length ? input.mapping : null,
    },
    { organizationId },
  );
  return data;
}

/** Re-read whatever a synced table comes from, as the person. */
export async function refreshAnySyncedTable(organizationId: string, tableId: string): Promise<SyncAnswer> {
  const { data } = await postJson<SyncAnswer>(
    "/synced-tables/refresh",
    { organization_id: organizationId, table_id: tableId },
    { organizationId },
  );
  return data;
}

/** Plain words for where a synced table's rows come from. */
export function syncedFromLabel(provider: string): string {
  if (provider === OUTSIDE_DATABASE_PROVIDER) return "an outside database";
  if (provider === "google_sheets") return "Google Sheets";
  if (provider === "csv_url") return "a CSV link";
  if (provider === "matrx_view") return "another table";
  return "outside AI Matrx";
}

export type ColumnKind = "text" | "number" | "boolean" | "datetime";
/** The person's column step for one source column. */
export interface ColumnPick {
  type?: ColumnKind;
  skip?: boolean;
  name?: string;
}

/** The column step: a link's columns with the kind inferred for each. Writes nothing. */
export async function previewSyncedLink(
  organizationId: string,
  input: { url: string; headerRow?: number },
): Promise<{ provider: string; columns: { name: string; type: ColumnKind }[]; rows: number }> {
  const { data } = await postJson<{ provider: string; columns: { name: string; type: ColumnKind }[]; rows: number }>(
    "/synced-tables/link/preview",
    { organization_id: organizationId, url: input.url, header_row: input.headerRow ?? 1 },
    { organizationId },
  );
  return data;
}

/** A synced cell edit: the server writes the connected sheet first, then lands it (CFL-058). */
export async function writeSyncedCell(
  organizationId: string,
  cell: { recordId: string; fieldKey: string; value: unknown; force: boolean },
): Promise<{ status: "written" | "conflict"; sheet_value: string | null; version: number | null }> {
  const { data } = await postJson<{ status: "written" | "conflict"; sheet_value: string | null; version: number | null }>(
    "/synced-tables/cell",
    { organization_id: organizationId, record_id: cell.recordId, field_key: cell.fieldKey, value: cell.value ?? null, force: cell.force },
    { organizationId },
  );
  return data;
}

/** Whether a synced table's source can take edits back (a CONNECTED Google Sheet only). */
export function sourceTakesEdits(source: { provider?: string; access?: string | null } | null | undefined): boolean {
  return source?.provider === "google_sheets" && source.access !== "link";
}
