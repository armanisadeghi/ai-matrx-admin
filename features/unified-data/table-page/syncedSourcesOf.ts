// features/unified-data/table-page/syncedSourcesOf.ts — lane TABLE-CREATE-SPEED.
// The table's rows in custom.synced_source (every connector's one registry), newest first, read ONCE per
// table per moment for every header chip that asks (SourceSyncBar, NotionSyncBar): it was two queries,
// each asked three times, on every table open.
import { supabase } from "@/utils/supabase/client";
import { forgetRead, readOnce } from "@/lib/read-once/readOnce";

export interface SyncedSourceRow {
  source_kind: string;
  source_ref: string | null;
  synced_at: string | null;
  last_report: unknown;
  mapping: unknown;
}

export function syncedSourcesOf(tableId: string): Promise<SyncedSourceRow[]> {
  return readOnce(`synced-sources:${tableId}`, async () => {
    const { data, error } = await supabase
      .schema("custom")
      .from("synced_source")
      .select("source_kind,source_ref,synced_at,last_report,mapping")
      .eq("target", tableId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as SyncedSourceRow[];
  });
}

/** After a sync wrote the row: the next reader asks again. */
export function forgetSyncedSources(tableId: string): void {
  forgetRead(`synced-sources:${tableId}`);
}
