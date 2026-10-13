"use client";

/**
 * The source bar of a table made by "Get data" — the synced-table pattern
 * (`unified-data/connect-database/SyncedTableBar`): where the rows came from, when, how many, and
 * Refresh / Get more, each naming its points before the click. ONE component for every host (the
 * table page, a board's Table tile): it reads the table's own refresh spec
 * (`scraper.data_fetch_job`) and renders nothing for a table that was never fetched. A host that
 * remembers more (the board tile keeps the address and the limit notes) passes it as `fetched`.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { DownloadCloud, History, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { tableShapeChanged } from "@ai-matrx/records/react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { getMoreCount, inputWords, type DataFetchInput, type DataFetchResult } from "./contract";
import { useOpenDataChangesWindow } from "@/features/overlays/openers/dataChangesWindow";

import { hasChanges, summaryParts } from "./changes";
import { fetchSpecKey, limitSettingHref, refreshHistoryKey, useDataSources, useFetchEstimate, useFetchSpec } from "./hooks";
import { recordNoun } from "./inputWords";
import { RefusalView } from "./RefusalView";
import { clearRun, startRun, useRun } from "./runs";
import { refreshTable } from "./server";

/** What a host may remember about the fetch beyond the table's own spec. */
export interface FetchedFacts {
  sourceKey: string;
  sourceLabel: string;
  input?: DataFetchInput;
  count: number;
  fetchedAt: string;
  rows: number;
  valuesAsText?: number;
  limitApplied?: { setting: string; value: number } | null;
  /** The server's honest notes about the fetch (a known issue, a fallback record key). */
  notices?: string[];
}

/** Re-renders every 30 s so "2 minutes ago" keeps moving. */
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
}

function ago(iso: string): string {
  return Number.isFinite(new Date(iso).getTime()) ? formatRelativeTime(iso, { style: "intl" }) : "";
}

export function FetchedTableBar({
  tableId,
  organizationId,
  runKey,
  fetched = null,
  onFinished,
  inline = false,
}: {
  tableId: string;
  /** In a page header: no rule under it, no padding. */
  inline?: boolean;
  /** The organization the fetch is billed to (the table's own, or the board's). */
  organizationId: string | null;
  /** One run per key (a second mount of the same table re-attaches to it). */
  runKey?: string;
  fetched?: FetchedFacts | null;
  onFinished?: (result: DataFetchResult) => void;
}) {
  const specRead = useFetchSpec(tableId);
  const spec = specRead.data ?? null;
  // The catalog is read only for a table that was fetched: a plain table never calls the server.
  if (!spec && !fetched) return null;
  return (
    <Bar
      tableId={tableId}
      organizationId={organizationId}
      runKey={runKey ?? `${tableId}:more`}
      fetched={fetched}
      onFinished={onFinished}
      inline={inline}
    />
  );
}

function Bar({
  tableId,
  organizationId,
  runKey,
  fetched,
  onFinished,
  inline,
}: {
  tableId: string;
  inline: boolean;
  organizationId: string | null;
  runKey: string;
  fetched: FetchedFacts | null;
  onFinished?: (result: DataFetchResult) => void;
}) {
  const catalog = useDataSources(organizationId);
  const specRead = useFetchSpec(tableId);
  const queryClient = useQueryClient();
  const estimate = useFetchEstimate();
  const spec = specRead.data ?? null;
  const sourceKey = spec?.sourceKey ?? fetched?.sourceKey ?? null;
  const catalogSource = catalog.data?.sources.find((s) => s.key === sourceKey) ?? null;
  const limit = catalog.data?.limits.max_records_per_fetch ?? null;
  const run = useRun(runKey);
  const openChanges = useOpenDataChangesWindow();
  useMinuteTick();
  const busy = run.status === "running";
  if (!sourceKey) return null;

  // Refresh = the stored spec as it is; Get more = the same spec with a larger count (the server
  // re-fetches from the top and bills every record, so the quote is the FULL new count).
  const current = spec?.maxRecords || fetched?.count || 0;
  const step = fetched?.count || current || 25;
  const refreshCount = Math.max(1, current);
  const moreCount = getMoreCount(current, step, limit?.value);
  const atLimit = limit != null && current >= limit.value;

  const finish = (result: DataFetchResult) => {
    onFinished?.(result);
    void queryClient.invalidateQueries({ queryKey: fetchSpecKey(tableId) });
    void queryClient.invalidateQueries({ queryKey: refreshHistoryKey(tableId) });
    tableShapeChanged(tableId);
    clearRun(runKey);
  };

  const go = (count: number) => {
    if (!organizationId) return;
    startRun(runKey, (onProgress) => refreshTable(tableId, count, { organizationId, onProgress }), finish);
  };

  const label = catalogSource?.label ?? fetched?.sourceLabel ?? sourceKey;
  const words = fetched?.input ? inputWords(fetched.input) : "";
  // The job's own times win (they are the truth after a reload); the tile's memory is the fallback.
  const when = spec?.finishedAt ?? spec?.createdAt ?? fetched?.fetchedAt ?? "";
  const rows = fetched?.rows ?? (spec ? spec.rowsCreated + spec.rowsUpdated : 0);
  const refreshCost = estimate(catalogSource, refreshCount);
  // Refresh re-fetches the stored count (the newest N); when the table holds more than that, "all" is its own honest choice.
  const noun = recordNoun(label);
  const allCount = Math.min(rows, limit?.value ?? rows);
  const showAll = rows > refreshCount && allCount > refreshCount;
  const allCost = showAll ? estimate(catalogSource, allCount) : null;
  const moreCost = estimate(catalogSource, moreCount);
  const textValues = fetched?.valuesAsText ?? 0;
  const trimmed = fetched?.limitApplied ?? null;
  const notices = fetched?.notices ?? [];
  const changeParts = summaryParts(spec?.changes ?? null);
  const settingHref = trimmed ? limitSettingHref(organizationId, trimmed.setting) : limit ? limitSettingHref(organizationId, limit.setting) : null;

  if (run.status === "failed") {
    return (
      <div className={inline ? "py-1" : "border-b border-border py-3"}>
        <RefusalView refusal={run.refusal} organizationId={organizationId} onBack={() => clearRun(runKey)} />
      </div>
    );
  }

  return (
    <div className={inline ? "flex min-w-0 shrink flex-col" : "flex shrink-0 flex-col gap-0.5 border-b border-border px-1 pb-1.5"} data-fetched-source-bar={sourceKey}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge tone="info">Fetched</Badge>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={words || label}>
          {label}
          {words ? ` · ${words}` : ""}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          · {busy ? (run.progress?.label ?? "Fetching") : ago(when)} · {formatCount(rows)} {rows === 1 ? "row" : "rows"}
        </span>
        <span className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              icon={<RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />}
              meta={refreshCost ?? undefined}
              disabled={busy || !organizationId}
              onClick={() => go(refreshCount)}
              data-fetch-refresh=""
            >
              {showAll ? `Check the newest ${formatCount(refreshCount)} ${noun}` : "Refresh"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showAll
              ? `Looks at the newest ${formatCount(refreshCount)} ${noun} only; the other ${formatCount(rows - refreshCount)} rows stay as they are`
              : `Fetch the same ${formatCount(refreshCount)} again and update rows`}
          </TooltipContent>
        </Tooltip>
        {showAll && (
          <Button
            variant="quiet"
            icon={<RefreshCw className="h-4 w-4" />}
            meta={allCost ?? undefined}
            disabled={busy || !organizationId}
            onClick={() => go(allCount)}
            data-fetch-refresh-all=""
          >
            {`Check all ${formatCount(allCount)}`}
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              icon={<DownloadCloud className="h-4 w-4" />}
              meta={moreCost ?? undefined}
              disabled={busy || !organizationId || atLimit}
              onClick={() => go(moreCount)}
              data-fetch-more=""
            >
              Get more
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {atLimit ? `At your limit of ${formatCount(limit?.value ?? 0)}` : `Fetch up to ${formatCount(moreCount)} into this table (billed for all)`}
          </TooltipContent>
        </Tooltip>
        {changeParts && !busy && (
          <Button
            variant="quiet"
            icon={<History className="h-4 w-4" />}
            meta={hasChanges(spec?.changes ?? null) ? changeParts.join(" · ") : "Nothing changed"}
            onClick={() => openChanges({ tableId, organizationId, jobId: spec?.jobId ?? null, tableName: fetched?.sourceLabel ?? null })}
            data-view-changes=""
            data-fetch-changes={hasChanges(spec?.changes ?? null) ? "some" : "none"}
          >
            View changes
          </Button>
        )}
      </div>
      {notices.length > 0 && (
        <div className="flex flex-col text-[11px] text-warning" data-fetch-notices="">
          {notices.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      )}
      {(textValues > 0 || trimmed) && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground" data-fetch-notes="">
          {textValues > 0 && <span>{formatCount(textValues)} values kept as text</span>}
          {textValues > 0 && trimmed && <span>·</span>}
          {trimmed && <span>Trimmed to your limit of {formatCount(trimmed.value)}</span>}
          {trimmed && settingHref && (
            <>
              <span>·</span>
              <Link href={settingHref} target="_blank" className="text-primary hover:underline">
                Change
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
