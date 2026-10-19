"use client";

// features/unified-data/table-page/SourceSyncBar.tsx — lane AT-SYNC. A table brought in from Airtable or GitHub remembers its source in
// custom.synced_source (the one registry every connector uses): this is its header chip and its "Sync now". Absent on any other table.
// A press is the only trigger — no schedule. Notion tables keep NotionSyncBar (their own report and webhook).

import { Button } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { tableShapeChanged } from "@ai-matrx/records/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { postJson } from "@/lib/python-client";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { supabase } from "@/utils/supabase/client";

import { SYNC_SOURCES, syncSentence, type SyncReport } from "./sourceSync";
import { sayError } from "@/features/unified-data/base/sayError";
import { HeldArchiveLine } from "./HeldArchiveLine";
import { answerHold, openHold } from "./heldArchive";

interface SourceRow { source_kind: string; synced_at: string | null; last_report?: SyncReport | null }

export function SourceSyncBar({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const [source, setSource] = useState<SourceRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [was, setWas] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    void supabase.schema("custom").from("synced_source").select("source_kind,synced_at,last_report")
      .in("source_kind", Object.keys(SYNC_SOURCES)).eq("target", tableId).is("deleted_at", null)
      .order("updated_at", { ascending: false }).limit(1)
      .then(({ data }) => { if (live) setSource((data?.[0] as SourceRow | undefined) ?? null); });
    return () => { live = false; };
  }, [tableId]);

  const again = useRef<() => void>(() => {});
  const syncNow = useCallback(async (confirmArchive?: string) => {
    if (!source) return;
    const kind = SYNC_SOURCES[source.source_kind]!;
    setBusy(true);
    try {
      const body = confirmArchive ? { table_id: tableId, confirm_archive: confirmArchive } : { table_id: tableId };
      const { data } = await postJson<SyncReport & { finished_at?: string }, { table_id: string; confirm_archive?: string }>(kind.path, body, organizationId ? { organizationId } : {});
      setWas(confirmArchive && data.archive_held && data.archive_confirm !== confirmArchive ? Number(confirmArchive.split(":")[0]) : null);
      setSource({ ...source, synced_at: data.finished_at ?? new Date().toISOString(),
                  last_report: { ...data, archive_kept: source.last_report?.archive_kept ?? null } });
      tableShapeChanged(tableId);
      // a held archive is asked on the bar, never announced as "synced"
      if (!data.archive_held) toast.success(syncSentence(kind.name, data));
    } catch (err) {
      toast.error(sayError(err, "The sync did not run."), { action: { label: "Try again", onClick: () => void again.current() } });
    } finally {
      setBusy(false);
    }
  }, [source, tableId, organizationId]);

  useEffect(() => { again.current = () => void syncNow(); }, [syncNow]);

  if (!source) return null;
  const kind = SYNC_SOURCES[source.source_kind]!;
  const when = source.synced_at ? formatRelativeTime(source.synced_at, { style: "intl" }) : "never";
  const held = openHold(source.last_report);
  const keep = async (token: string) => {
    if (!organizationId) return;
    try {
      await answerHold(organizationId, tableId, "keep", token);
      setSource({ ...source, last_report: { ...(source.last_report ?? {}), archive_kept: token } });
    } catch (err) {
      toast.error(sayError(err, "Keep was not saved."));
    }
  };
  return (
    <div className="flex shrink-0 items-center gap-1" data-source-sync-bar={source.source_kind}>
      {held ? (
        <HeldArchiveLine source={kind.name} held={held.held} was={was} busy={busy}
          onArchive={() => void syncNow(held.confirm)} onKeep={() => void keep(held.confirm)} />
      ) : (
        <span className="hidden max-w-[16rem] truncate px-1 text-xs text-muted-foreground md:inline" data-source-sync-when="">
          {busy ? `Syncing ${kind.name}` : `${kind.name} synced ${when}`}
        </span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button icon={<RefreshCw className={busy ? "animate-spin" : undefined} />} variant="quiet" aria-label={`Sync now with ${kind.name}`} disabled={busy} onClick={() => void syncNow()} data-source-sync-now="" />
        </TooltipTrigger>
        <TooltipContent>{`Sync now with ${kind.name}`}</TooltipContent>
      </Tooltip>
    </div>
  );
}
