"use client";

// features/unified-data/connect-database/SyncedTableBar.tsx — LANE VISION-REACH wave 3, widened by
// LANE SYNC-AIRTABLE (2026-10-10) to every synced table.
//
// On the table page's header, for a Table synced from anywhere (an outside database, a Google Sheet,
// a CSV link, another table's view): the Synced chip, "from <source> · <when>", Refresh (one server
// door for every provider) and the auto-refresh knob. A person who may only view the table is told
// nothing on the automatic refresh-on-open — the store refuses it for them, and the chip still says
// when it last synced; pressing Refresh shows the store's own sentence.

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { tableShapeChanged, useRecordsClient, useTable } from "@ai-matrx/records/react";

import { Select } from "@ai-matrx/design-system/controls";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";

import { OUTSIDE_DATABASE_PROVIDER, refreshAnySyncedTable, sourceTakesEdits, syncedFromLabel, type SyncAutoRefresh } from "./service";
import { SyncedBadge } from "./SyncedBadge";
import { formatRelativeTime } from "@ai-matrx/kit/format";

/** A table refreshed this recently is not refreshed again just for being opened. */
const OPEN_REFRESH_AFTER_MS = 60_000;

interface SyncSource {
  provider?: string;
  synced_at?: string | null;
  label?: string | null;
  auto_refresh?: SyncAutoRefresh | null;
  access?: string | null;
}

function syncSourceOf(table: unknown): SyncSource | null {
  const source = (table as { sync_source?: unknown } | null)?.sync_source;
  return source && typeof source === "object" ? (source as SyncSource) : null;
}

function agoText(iso: string | null | undefined): string {
  if (!iso) return "never";
  if (!Number.isFinite(new Date(iso).getTime())) return "never";
  return formatRelativeTime(iso, { style: "intl" });
}

const INTERVALS: Record<string, { value: SyncAutoRefresh; label: string }[]> = {
  matrx_view: [
    { value: "on_change", label: "On change" },
    { value: "off", label: "Manual" },
  ],
  default: [
    { value: "off", label: "Manual" },
    { value: "hourly", label: "Hourly" },
    { value: "daily", label: "Daily" },
  ],
};

export function SyncedTableBar({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const table = useTable(tableId);
  const client = useRecordsClient();
  const source = syncSourceOf(table.data);
  const orgId = organizationId ?? (table.data as { organization_id?: string } | null)?.organization_id ?? null;
  const [busy, setBusy] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [auto, setAuto] = useState<SyncAutoRefresh | null>(null);
  const opened = useRef(false);
  const isOutside = source?.provider === OUTSIDE_DATABASE_PROVIDER;
  const lastSynced = syncedAt ?? source?.synced_at ?? null;
  const interval = auto ?? source?.auto_refresh ?? (source?.provider === "matrx_view" ? "on_change" : "off");
  const choices = INTERVALS[source?.provider === "matrx_view" ? "matrx_view" : "default"];

  const refresh = useCallback(
    async (quiet: boolean) => {
      if (!orgId) return;
      setBusy(true);
      try {
        const answer = await refreshAnySyncedTable(orgId, tableId);
        setSyncedAt(answer.synced_at);
        tableShapeChanged(tableId);
        if (!quiet && answer.warnings?.length) toast.warning(answer.warnings.join(" "));
      } catch (err) {
        if (!quiet) toast.error(extractErrorMessage(err));
        else console.warn("[synced table] refresh on open did not run:", extractErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [orgId, tableId],
  );

  const setInterval = useCallback(
    async (next: SyncAutoRefresh) => {
      const before = interval;
      setAuto(next);
      const done = await client.tableSyncSettingsSet({ table_id: tableId, settings: { auto_refresh: next } });
      if (!done.ok) {
        setAuto(before);
        toast.error(done.error.message);
      }
    },
    [client, interval, tableId],
  );

  // An outside database refreshes once on open (VISION-REACH); the others keep their own interval.
  useEffect(() => {
    if (!isOutside || opened.current || !orgId) return;
    opened.current = true;
    const last = source?.synced_at ? new Date(source.synced_at).getTime() : 0;
    if (Date.now() - last > OPEN_REFRESH_AFTER_MS) void refresh(true);
  }, [isOutside, orgId, source?.synced_at, refresh]);

  if (!source?.provider) return null;
  const from = source.label ? `${syncedFromLabel(source.provider)} · ${source.label}` : syncedFromLabel(source.provider);
  return (
    <div className="flex shrink-0 items-center gap-1" data-synced-table-bar={source.provider}>
      <SyncedBadge provider={source.provider} />
      <span className="hidden max-w-[16rem] truncate text-xs text-muted-foreground md:inline" data-synced-table-when="">
        {busy ? "Syncing" : `Synced ${agoText(lastSynced)}`}
      </span>
      {/* A sheet shared by link, a CSV, an outside database or another table: edits happen at the source. */}
      {!sourceTakesEdits(source) ? (
        <span className="hidden text-xs text-muted-foreground lg:inline" data-synced-table-readonly="">
          Read-only source
        </span>
      ) : null}
      <span title={`From ${from}`} data-synced-table-interval="">
        <Select<SyncAutoRefresh>
          aria-label="Auto-refresh"
          value={interval}
          options={choices}
          onValueChange={(next) => void setInterval(next)}
        />
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Sync now"
            disabled={busy}
            onClick={() => void refresh(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
            data-synced-table-refresh=""
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>{busy ? "Syncing" : "Sync now"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
