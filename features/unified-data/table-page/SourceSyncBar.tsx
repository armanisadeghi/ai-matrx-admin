"use client";

// features/unified-data/table-page/SourceSyncBar.tsx — lane AT-SYNC. A table brought in from Airtable or GitHub remembers its source in
// custom.synced_source (the one registry every connector uses): this is its header chip and its "Sync now". Absent on any other table.
// A press is the only trigger — no schedule. Notion tables keep NotionSyncBar (their own report and webhook).

import { Button } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { tableShapeChanged } from "@ai-matrx/records/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { postJson } from "@/lib/python-client";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { supabase } from "@/utils/supabase/client";

/** source_kind in custom.synced_source → the words and the aidream door for its Sync now. */
export const SYNC_SOURCES: Record<string, { name: string; path: string }> = {
  airtable_base: { name: "Airtable", path: "/airtable-import/sync" },
  github_issues: { name: "GitHub", path: "/github-sync/sync" },
};

interface SourceRow { source_kind: string; synced_at: string | null }
interface SyncReport { added?: number; updated?: number; archived?: number; conflicts?: unknown[]; notices?: string[] }

/** What one finished sync says, in a sentence. */
export function syncSentence(name: string, r: SyncReport): string {
  const parts = [`${r.added ?? 0} added`, `${r.updated ?? 0} updated`];
  if (r.archived) parts.push(`${r.archived} archived`);
  const c = r.conflicts?.length ?? 0;
  return `${name} synced: ${parts.join(", ")}${c ? `, ${c} kept yours (${name}'s version is a comment on the row)` : ""}.`;
}

export function SourceSyncBar({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const [source, setSource] = useState<SourceRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void supabase.schema("custom").from("synced_source").select("source_kind,synced_at")
      .in("source_kind", Object.keys(SYNC_SOURCES)).eq("target", tableId).is("deleted_at", null)
      .order("updated_at", { ascending: false }).limit(1)
      .then(({ data }) => { if (live) setSource((data?.[0] as SourceRow | undefined) ?? null); });
    return () => { live = false; };
  }, [tableId]);

  const syncNow = useCallback(async () => {
    if (!source) return;
    const kind = SYNC_SOURCES[source.source_kind]!;
    setBusy(true);
    try {
      const { data } = await postJson<SyncReport & { finished_at?: string }, { table_id: string }>(kind.path, { table_id: tableId }, organizationId ? { organizationId } : {});
      setSource({ ...source, synced_at: data.finished_at ?? new Date().toISOString() });
      tableShapeChanged(tableId);
      toast.success(syncSentence(kind.name, data));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [source, tableId, organizationId]);

  if (!source) return null;
  const kind = SYNC_SOURCES[source.source_kind]!;
  const when = source.synced_at ? formatRelativeTime(source.synced_at, { style: "intl" }) : "never";
  return (
    <div className="flex shrink-0 items-center gap-1" data-source-sync-bar={source.source_kind}>
      <span className="hidden max-w-[16rem] truncate px-1 text-xs text-muted-foreground md:inline" data-source-sync-when="">
        {busy ? `Syncing ${kind.name}` : `${kind.name} synced ${when}`}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button icon={<RefreshCw className={busy ? "animate-spin" : undefined} />} variant="quiet" aria-label={`Sync now with ${kind.name}`} disabled={busy} onClick={() => void syncNow()} data-source-sync-now="" />
        </TooltipTrigger>
        <TooltipContent>{`Sync now with ${kind.name}`}</TooltipContent>
      </Tooltip>
    </div>
  );
}
