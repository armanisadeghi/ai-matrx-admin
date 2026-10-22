"use client";

/**
 * A library run's results, ON THE PAGE, right under the search (owner, 2026-10-22: "embed that
 * experience directly on the page so the user sees the results and can click each one"). The rows
 * are the person's own custom table, drawn by the ONE table mount (`LocatedTableViewer` — exactly
 * what /data/<table> renders: its grid, record pane, peeks, realtime). While the run fills, the
 * stage line sits above the table and the rows land as the server stores them; before the server
 * has named the table, the row skeleton holds the place. "Open as table" is the secondary door.
 *
 * No price here: results are doing, not deciding (law 14).
 */

import dynamic from "next/dynamic";
import { CheckCircle2, SearchX, Table2 } from "lucide-react";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";

import { AddToBoard } from "../AddToBoard";
import { FetchProgress } from "../FetchProgress";
import { RefusalView } from "../RefusalView";
import type { RunState } from "../runs";
import { isOpenStatus, runStatusLabel, useDataFetchJob, type FetchJobRow } from "./runHistory";

// The grid is heavy: it loads when there are results to draw, never with the library.
const LocatedTableViewer = dynamic(() => import("@/features/data-tables/components/LocatedTableViewer"), {
  ssr: false,
  loading: () => <RegionSkeleton shape="rows" count={8} aria-label="Loading results" />,
});

/** The table, inline, at a height that shows a screenful of rows and keeps the page scrolling. */
export function InlineResultsTable({ tableId }: { tableId: string }) {
  return (
    <div className="flex h-[min(78dvh,760px)] min-h-[420px] flex-col" data-inline-results={tableId}>
      <LocatedTableViewer tableId={tableId} />
    </div>
  );
}

function OpenAsTable({ tableId }: { tableId: string }) {
  return (
    <Button
      variant="quiet"
      icon={<Table2 className="h-4 w-4" />}
      onClick={() => window.open(`/data/${encodeURIComponent(tableId)}`, "_blank", "noopener")}
      data-open-table=""
    >
      Open as table
    </Button>
  );
}

function DoneLine({
  rows,
  tableId,
  tableName,
  lowered,
  notices,
}: {
  rows: number;
  tableId: string;
  tableName: string | null;
  lowered?: number | null;
  notices?: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-1" data-fetch-done={tableId}>
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
        <span className="text-sm font-semibold text-foreground">
          {formatCount(rows)} {rows === 1 ? "record" : "records"}
        </span>
        {tableName ? <span className="min-w-0 truncate text-xs text-muted-foreground">in {tableName}</span> : null}
        <span className="ml-auto flex items-center gap-1">
          <AddToBoard tableId={tableId} tableName={tableName} />
          <OpenAsTable tableId={tableId} />
        </span>
      </div>
      {lowered != null ? <p className="text-xs text-muted-foreground">Lowered to your limit of {formatCount(lowered)}</p> : null}
      {(notices ?? []).map((n) => (
        <p key={n} className="text-xs text-warning" data-fetch-notice="">
          {n}
        </p>
      ))}
    </div>
  );
}

/** Rows still to come: the place the table will take, so nothing jumps when it arrives. */
function RowsComing() {
  return (
    <div className="flex h-[min(78dvh,760px)] min-h-[420px] flex-col" data-results-coming="">
      <RegionSkeleton shape="rows" count={8} aria-label="Rows land here" />
    </div>
  );
}

/** The live run in memory: stage line, then the table filling as the server stores rows. */
export function LiveRunResults({
  label,
  run,
  organizationId,
  onClear,
}: {
  label: string;
  run: Exclude<RunState, { status: "idle" }>;
  organizationId: string;
  onClear: () => void;
}) {
  const liveJobId = run.status === "running" ? (run.progress?.jobId ?? null) : null;
  const liveJob = useDataFetchJob(liveJobId);
  if (run.status === "failed") {
    return (
      <div className="flex py-6">
        <RefusalView refusal={run.refusal} organizationId={organizationId} onBack={onClear} />
      </div>
    );
  }
  if (run.status === "running") {
    const tableId = liveJob.data?.table_id ?? null;
    return (
      <div className="flex flex-col gap-3" data-results-live="">
        <FetchProgress label={label} progress={run.progress} startedAt={run.startedAt} layout="row" />
        {tableId ? <InlineResultsTable tableId={tableId} /> : <RowsComing />}
      </div>
    );
  }
  const done = run.result;
  return (
    <div className="flex flex-col gap-3">
      <DoneLine
        rows={done.rows_created + done.rows_updated}
        tableId={done.table_id}
        tableName={done.table_name}
        lowered={done.limit_applied?.value ?? null}
        notices={done.notices}
      />
      <InlineResultsTable tableId={done.table_id} />
    </div>
  );
}

/** An earlier run, reopened from its row (a past run, or the address after a reload). */
export function SavedRunResults({ jobId }: { jobId: string }) {
  const job = useDataFetchJob(jobId);
  if (job.isLoading) return <RowsComing />;
  const row: FetchJobRow | null = job.data ?? null;
  if (!row) {
    return <EmptyState icon={<SearchX className="h-5 w-5" />} title="Run not found" line="It may have been removed." />;
  }
  if (isOpenStatus(row.status)) {
    return (
      <div className="flex flex-col gap-3" data-results-live="">
        <FetchProgress label={runStatusLabel(row.status)} progress={{ label: runStatusLabel(row.status), current: null, total: null, jobId }} startedAt={Date.parse(row.created_at)} layout="row" />
        {row.table_id ? <InlineResultsTable tableId={row.table_id} /> : <RowsComing />}
      </div>
    );
  }
  if (!row.table_id) {
    return (
      <EmptyState
        icon={<SearchX className="h-5 w-5" />}
        title={row.status === "done" ? "No records came back" : "This run failed"}
        line={row.error ?? "Try again with different words."}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <DoneLine rows={row.rows_created + row.rows_updated} tableId={row.table_id} tableName={row.table_name} />
      <InlineResultsTable tableId={row.table_id} />
    </div>
  );
}
