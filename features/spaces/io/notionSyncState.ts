/**
 * The Notion source of a table and its last sync report, read straight from
 * Supabase (`custom.synced_source`, row security decides who sees it) — replaces
 * `GET /notion-import/sync`, which only read this row. "Sync now" stays on the
 * server: it pulls from Notion.
 */
import { supabase } from "@/utils/supabase/client";

export interface NotionSyncState {
  connected: boolean;
  notion_id?: string | null;
  kind?: string;
  synced_at?: string | null;
  report?: Record<string, unknown> | null;
}

export async function readNotionSyncState(tableId: string): Promise<NotionSyncState> {
  const { data, error } = await supabase
    .schema("custom")
    .from("synced_source")
    .select("source_ref,synced_at,last_report,mapping")
    .eq("source_kind", "notion_database")
    .eq("target", tableId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return { connected: false };
  const last = row.last_report;
  const base = last && typeof last === "object" && !Array.isArray(last) ? (last as Record<string, unknown>) : null;
  return {
    connected: true,
    notion_id: row.source_ref,
    kind: "database",
    synced_at: row.synced_at,
    report: row.mapping != null ? { ...(base ?? {}), map: row.mapping } : base,
  };
}
