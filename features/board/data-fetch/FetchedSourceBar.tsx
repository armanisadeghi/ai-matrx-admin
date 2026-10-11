"use client";

/**
 * The Table tile's source bar for a table made by "Get data" — the synced-table pattern
 * (`unified-data/connect-database/SyncedTableBar`): where the rows came from, when, how many, and
 * Refresh / Get more, each naming its points before the click. One compact row; a second short line
 * only when some values were kept as text or a limit trimmed the fetch.
 */

import Link from "next/link";
import { DownloadCloud, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { tableShapeChanged } from "@ai-matrx/records/react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { NodeSource } from "../board/document";
import { RefusalView, useFetchOrganizationId } from "./GetDataBody";
import { fetchSpecKey, limitSettingHref, useDataSources, useFetchEstimate, useFetchSpec } from "./hooks";
import { getMoreCount } from "./contract";
import { clearRun, startRun, useRun } from "./runs";
import { refreshTable } from "./server";
import { inputWords, provenanceOf, withDataFetchMeta, type DataFetchProvenance } from "./tile-meta";

function ago(iso: string): string {
  return Number.isFinite(new Date(iso).getTime()) ? formatRelativeTime(iso, { style: "intl" }) : "";
}

export function FetchedSourceBar({
  tileId,
  tableId,
  source,
  fetched,
  onSource,
}: {
  tileId: string;
  tableId: string;
  source: NodeSource;
  /** What the tile remembers (shown while the table's own spec loads, and the address words). */
  fetched: DataFetchProvenance | null;
  onSource: (next: NodeSource, title?: string) => void;
}) {
  const organizationId = useFetchOrganizationId();
  const catalog = useDataSources(organizationId);
  const specRead = useFetchSpec(tableId);
  const queryClient = useQueryClient();
  const estimate = useFetchEstimate();
  const spec = specRead.data ?? null;
  const sourceKey = spec?.sourceKey ?? fetched?.sourceKey ?? null;
  const catalogSource = catalog.data?.sources.find((s) => s.key === sourceKey) ?? null;
  const limit = catalog.data?.limits.max_records_per_fetch ?? null;
  const key = `${tileId}:more`;
  const run = useRun(key);
  const busy = run.status === "running";
  if (!sourceKey) return null;

  // Refresh = the stored spec as it is; Get more = the same spec with a larger count (the server
  // re-fetches from the top and bills every record, so the quote is the FULL new count).
  const current = spec?.maxRecords || fetched?.count || 0;
  const step = fetched?.count || current || 25;
  const refreshCount = Math.max(1, current);
  const moreCount = getMoreCount(current, step, limit?.value);
  const atLimit = limit != null && current >= limit.value;

  const finish = (result: Parameters<typeof provenanceOf>[0]) => {
    if (fetched && source.kind === "entity") {
      const next = provenanceOf(result, fetched, fetched);
      onSource({ ...source, meta: withDataFetchMeta(source.meta, { fetched: next }) });
    }
    void queryClient.invalidateQueries({ queryKey: fetchSpecKey(tableId) });
    tableShapeChanged(tableId);
    clearRun(key);
  };

  const go = (count: number) => {
    if (!organizationId) return;
    startRun(key, (onProgress) => refreshTable(tableId, count, { organizationId, onProgress }), finish);
  };

  const label = catalogSource?.label ?? fetched?.sourceLabel ?? sourceKey;
  const when = spec?.finishedAt ?? fetched?.fetchedAt ?? "";
  const rows = fetched?.rows ?? (spec ? spec.rowsCreated + spec.rowsUpdated : 0);
  const refreshCost = estimate(catalogSource, refreshCount);
  const moreCost = estimate(catalogSource, moreCount);
  const textValues = fetched?.valuesAsText ?? 0;
  const trimmed = fetched?.limitApplied ?? null;
  const settingHref = trimmed ? limitSettingHref(organizationId, trimmed.setting) : limit ? limitSettingHref(organizationId, limit.setting) : null;

  if (run.status === "failed") {
    return (
      <div className="border-b border-border py-3">
        <RefusalView refusal={run.refusal} organizationId={organizationId} onBack={() => clearRun(key)} />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-0.5 border-b border-border px-1 pb-1.5" data-fetched-source-bar={sourceKey}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge tone="info">Fetched</Badge>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={fetched ? inputWords(fetched.input) : label}>
          {label}
          {fetched ? ` · ${inputWords(fetched.input)}` : ""}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          · {busy ? (run.progress?.label ?? "Fetching") : ago(when)} · {formatCount(rows)} rows
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
              Refresh
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fetch the same {formatCount(refreshCount)} again and update rows</TooltipContent>
        </Tooltip>
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
      </div>
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
