"use client";

/**
 * The Table tile's source bar for a table made by "Get data" — the synced-table pattern
 * (`unified-data/connect-database/SyncedTableBar`): where the rows came from, when, how many, and
 * Refresh / Get more, each naming its points before the click. One compact row; a second short line
 * only when some values were kept as text or a limit trimmed the fetch.
 */

import Link from "next/link";
import { DownloadCloud, RefreshCw } from "lucide-react";
import { tableShapeChanged } from "@ai-matrx/records/react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { NodeSource } from "../board/document";
import { RefusalView, useFetchOrganizationId } from "./GetDataBody";
import { limitSettingHref, useDataSources, useFetchEstimate } from "./hooks";
import { clearRun, startRun, useRun } from "./runs";
import { fetchData, refreshTable } from "./server";
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
  fetched: DataFetchProvenance;
  onSource: (next: NodeSource, title?: string) => void;
}) {
  const organizationId = useFetchOrganizationId();
  const catalog = useDataSources(organizationId);
  const estimate = useFetchEstimate();
  const catalogSource = catalog.data?.sources.find((s) => s.key === fetched.sourceKey) ?? null;
  const limit = catalog.data?.limits.max_records_per_fetch ?? null;
  const key = `${tileId}:more`;
  const run = useRun(key);
  const busy = run.status === "running";
  const n = fetched.count;

  const finish = (result: Parameters<typeof provenanceOf>[0]) => {
    if (source.kind !== "entity") return;
    const next = provenanceOf(result, fetched, fetched);
    onSource({ ...source, meta: withDataFetchMeta(source.meta, { fetched: next }) });
    tableShapeChanged(tableId);
    clearRun(key);
  };

  const go = (mode: "refresh" | "more") => {
    if (!organizationId) return;
    startRun(
      key,
      (onProgress) =>
        mode === "refresh"
          ? refreshTable(tableId, n, { organizationId, onProgress })
          : fetchData({ sourceKey: fetched.sourceKey, input: fetched.input, maxRecords: n, tableId }, { organizationId, onProgress }),
      finish,
    );
  };

  const cost = estimate(catalogSource, n);
  const textValues = fetched.valuesAsText ?? 0;
  const trimmed = fetched.limitApplied ?? null;
  const settingHref = trimmed ? limitSettingHref(organizationId, trimmed.setting) : limit ? limitSettingHref(organizationId, limit.setting) : null;

  if (run.status === "failed") {
    return (
      <div className="border-b border-border py-3">
        <RefusalView refusal={run.refusal} organizationId={organizationId} onBack={() => clearRun(key)} />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-0.5 border-b border-border px-1 pb-1.5" data-fetched-source-bar={fetched.sourceKey}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Badge tone="info">Fetched</Badge>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={inputWords(fetched.input)}>
          {fetched.sourceLabel} · {inputWords(fetched.input)}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          · {busy ? (run.progress?.label ?? "Fetching") : ago(fetched.fetchedAt)} · {fetched.rows.toLocaleString("en-US")} rows
        </span>
        <span className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              icon={<RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />}
              meta={cost ?? undefined}
              disabled={busy || !organizationId}
              onClick={() => go("refresh")}
              data-fetch-refresh=""
            >
              Refresh
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fetch the same {n} again and update rows</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="quiet"
              icon={<DownloadCloud className="h-4 w-4" />}
              meta={cost ?? undefined}
              disabled={busy || !organizationId}
              onClick={() => go("more")}
              data-fetch-more=""
            >
              Get more
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fetch {n} more into this table</TooltipContent>
        </Tooltip>
      </div>
      {(textValues > 0 || trimmed) && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground" data-fetch-notes="">
          {textValues > 0 && <span>{textValues.toLocaleString("en-US")} values kept as text</span>}
          {textValues > 0 && trimmed && <span>·</span>}
          {trimmed && <span>Trimmed to your limit of {trimmed.value.toLocaleString("en-US")}</span>}
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
