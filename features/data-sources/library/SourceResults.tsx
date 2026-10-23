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
import { useMemo } from "react";
import { useFields } from "@ai-matrx/records/react";
import { CheckCircle2, SearchX, Table2 } from "lucide-react";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";

import { AddToBoard } from "../AddToBoard";
import { FetchProgress } from "../FetchProgress";
import { RefusalView } from "../RefusalView";
import type { DataFetchResult } from "../contract";
import type { RunState } from "../runs";
import { isOpenStatus, runRowFilter, runScope, runStatusLabel, useDataFetchJob, useResumeStalledRun, useRunRowKeys, useTypicalRunMs, type FetchJobRow } from "./runHistory";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { tookWords } from "./runTiming";
import { openingHiddenFields } from "../openingColumns";
import { useLibrary, useLibraryOrganizationId } from "./hooks";
import { UnderTheHood } from "./UnderTheHood";

// The grid is heavy: it loads when there are results to draw, never with the library.
const LocatedTableViewer = dynamic(() => import("@/features/data-tables/components/LocatedTableViewer"), {
  ssr: false,
  loading: () => <RegionSkeleton shape="rows" count={8} aria-label="Loading results" />,
});

/** Said, in one line, when the grid cannot be narrowed to the run (nothing may differ silently). */
export const ALL_ROWS_NOTICE = "Showing all saved rows: this run predates per-run results.";

/**
 * The table, inline, at a height that shows a screenful of rows and keeps the page scrolling.
 * Every run of a source writes one shared table, so the grid is narrowed to the keys the server
 * recorded for THIS run (read for the run on view only). A run whose keys cannot be told says so, in
 * a line above the grid, with the door to the full table. Either way the grid here is read-only: a
 * record added in a narrowed view would belong to no run and vanish at once, so records are added
 * in the full table ("Open as table").
 */
/**
 * The grid opens on the source's short plain set (THE ONE COLUMN REGISTRY, `../openingColumns`), the same
 * columns "What you get" lists; every other column is hidden through the grid's own hidden-columns look, one
 * click away. The grid reads its opening look once, on arrival; it waits for the fields so it opens on it.
 */
function useOpeningHidden(tableId: string, sourceKey: string | null | undefined): { ready: boolean; hidden: string[] | null } {
  const organizationId = useLibraryOrganizationId();
  const library = useLibrary(sourceKey ? organizationId : null);
  const fields = useFields(sourceKey ? tableId : null);
  const source = sourceKey ? library.data?.sources.find((s) => s.key === sourceKey) ?? null : null;
  const hidden = useMemo(
    () => (source && fields.data ? openingHiddenFields(fields.data, source.output_fields ?? [], undefined, source.key) : null),
    [source, fields.data],
  );
  const ready = !sourceKey || !(library.isLoading || fields.isLoading);
  return { ready, hidden };
}

export function InlineResultsTable({ tableId, job }: { tableId: string; job?: FetchJobRow | null }) {
  const keysQuery = useRunRowKeys(job);
  const keys = keysQuery.data ?? null;
  const scope = runScope(job, keys);
  const opening = useOpeningHidden(tableId, job?.source_key);
  if (scope === "coming" || (Boolean(job?.id) && keysQuery.isLoading) || !opening.ready) return <RowsComing />;
  const filter = runRowFilter(job, keys);
  return (
    <div className="flex flex-col gap-2" data-run-scope={scope}>
      {scope === "all-rows" ? (
        <div className="flex flex-wrap items-center gap-2" data-all-rows-notice="">
          <p className="min-w-0 flex-1 text-xs text-warning">{ALL_ROWS_NOTICE}</p>
          <OpenAsTable tableId={tableId} />
        </div>
      ) : null}
      <div className="flex h-[min(78dvh,760px)] min-h-[420px] flex-col" data-inline-results={tableId} data-run-rows={filter ? "this-run" : "all"}>
        <LocatedTableViewer
          key={opening.hidden ? "opening-columns" : "plain"}
          tableId={tableId}
          filter={filter}
          rowPeek
          readOnly
          {...(opening.hidden ? { viewAddress: { hidden: opening.hidden } } : {})}
        />
      </div>
    </div>
  );
}

function OpenAsTable({ tableId }: { tableId: string }) {
  return (
    <Button
      variant="quiet"
      icon={<Table2 className="h-4 w-4" />}
      onClick={() => openOutbound(`/data/${encodeURIComponent(tableId)}`, "_blank", "noopener")}
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
  tookMs,
}: {
  rows: number;
  tableId: string;
  tableName: string | null;
  lowered?: number | null;
  notices?: readonly string[];
  /** How long the run took (the job's own clock); said beside the count. */
  tookMs?: number | null;
}) {
  return (
    <div className="flex flex-col gap-1" data-fetch-done={tableId}>
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
        <span className="text-sm font-semibold text-foreground">
          {formatCount(rows)} {rows === 1 ? "record" : "records"}
        </span>
        {tableName ? <span className="min-w-0 truncate text-xs text-muted-foreground">in {tableName}</span> : null}
        {tookMs != null ? <span className="shrink-0 text-xs text-muted-foreground" data-run-took="">{tookWords(tookMs)}</span> : null}
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
  useResumeStalledRun(liveJob.data);
  const typical = useTypicalRunMs(liveJob.data?.source_key);
  if (run.status === "failed") {
    return (
      <div className="flex py-6">
        <RefusalView refusal={run.refusal} organizationId={organizationId} onBack={onClear} />
      </div>
    );
  }
  if (run.status === "running") {
    const row = liveJob.data ?? null;
    const tableId = row?.table_id ?? null;
    // A run re-attached after a reload reads only "Working" from the server: the job row's own
    // status says more, and its start time keeps the clock honest across the reload.
    const progress =
      row && run.progress && (run.progress.label === "Working" || run.progress.label === "Starting")
        ? { ...run.progress, label: runStatusLabel(row.status) }
        : run.progress;
    const startedAt = row ? Math.min(run.startedAt, Date.parse(row.created_at) || run.startedAt) : run.startedAt;
    return (
      <div className="flex flex-col gap-3" data-results-live="">
        <FetchProgress label={label} progress={progress} startedAt={startedAt} layout="row" typicalMs={typical.data ?? null} />
        <UnderTheHood jobId={liveJobId} open />
        {tableId ? <InlineResultsTable tableId={tableId} job={row} /> : <RowsComing />}
      </div>
    );
  }
  return <DoneRunResults result={run.result} />;
}

/** A run that just finished in this tab: its job row carries the keys of the rows it stored. */
function DoneRunResults({ result: done }: { result: DataFetchResult }) {
  const jobQuery = useDataFetchJob(done.job_id ?? null);
  const job = jobQuery.data ?? null;
  return (
    <div className="flex flex-col gap-3">
      <DoneLine
        rows={done.rows_created + done.rows_updated}
        tableId={done.table_id}
        tableName={done.table_name}
        lowered={done.limit_applied?.value ?? null}
        notices={done.notices}
        tookMs={job?.duration_ms ?? null}
      />
      <UnderTheHood jobId={done.job_id ?? null} />
      {jobQuery.isLoading ? <RowsComing /> : <InlineResultsTable tableId={done.table_id} job={job} />}
    </div>
  );
}

/** An earlier run, reopened from its row (a past run, or the address after a reload). */
export function SavedRunResults({ jobId }: { jobId: string }) {
  const job = useDataFetchJob(jobId);
  useResumeStalledRun(job.data);
  const typical = useTypicalRunMs(job.data?.source_key);
  if (job.isLoading) return <RowsComing />;
  const row: FetchJobRow | null = job.data ?? null;
  if (!row) {
    return <EmptyState icon={<SearchX className="h-5 w-5" />} title="Run not found" line="It may have been removed." />;
  }
  if (isOpenStatus(row.status)) {
    return (
      <div className="flex flex-col gap-3" data-results-live="">
        <FetchProgress label={runStatusLabel(row.status)} progress={{ label: runStatusLabel(row.status), current: null, total: null, jobId }} startedAt={Date.parse(row.created_at)} layout="row" typicalMs={typical.data ?? null} />
        <UnderTheHood jobId={jobId} open />
        {row.table_id ? <InlineResultsTable tableId={row.table_id} job={row} /> : <RowsComing />}
      </div>
    );
  }
  if (!row.table_id) {
    return (
      <div className="flex flex-col gap-3">
      <EmptyState
        icon={<SearchX className="h-5 w-5" />}
        title={row.status === "done" ? "No records came back" : "This run failed"}
        line={row.error ?? "Try again with different words."}
      />
      <UnderTheHood jobId={jobId} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <DoneLine rows={row.rows_created + row.rows_updated} tableId={row.table_id} tableName={row.table_name} tookMs={row.duration_ms ?? null} />
      <UnderTheHood jobId={jobId} />
      <InlineResultsTable tableId={row.table_id} job={row} />
    </div>
  );
}
