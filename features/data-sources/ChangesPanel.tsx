"use client";

/**
 * What a refresh changed — the body of the "Changes" window. A list of every finished refresh of the
 * table (when, counts, points spent), and for the one picked: New / Changed / Gone. Changed rows show
 * each field as before → after, numbers with their delta (Rating 4.3 → 4.1 ▼0.2). Reads only; it
 * never edits a row ("gone" is a report, not a delete).
 */

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { EmptyState, RegionSkeleton, Tabs } from "@ai-matrx/design-system/controls";
import { formatPoints, formatRelativeTime } from "@ai-matrx/kit/format";

import { useCostDisplay } from "@/components/cost/useCostDisplay";

import {
  fieldDelta,
  firstTab,
  hasChanges,
  showValue,
  summaryParts,
  tabCounts,
  type ChangedField,
  type ChangedKey,
  type ChangedRow,
  type ChangesTab,
  type RefreshRun,
} from "./changes";
import { useJobChanges, useRefreshHistory } from "./hooks";

const DELTA_CLASS = { up: "text-success", down: "text-destructive", same: "text-muted-foreground" } as const;

function when(iso: string | null): string {
  return iso && Number.isFinite(new Date(iso).getTime()) ? formatRelativeTime(iso, { style: "intl" }) : "";
}

export function ChangesPanel({ tableId, organizationId, jobId }: { tableId: string; organizationId: string | null; jobId?: string | null }) {
  const history = useRefreshHistory(tableId);
  const runs = history.data ?? [];
  const [picked, setPicked] = useState<string | null>(jobId ?? null);
  // The newest refresh (not the first fetch that made the table) unless one was asked for.
  const selected = picked ?? runs.find((r) => !r.summary?.firstFetch)?.jobId ?? runs[0]?.jobId ?? null;

  if (history.isLoading) return <RegionSkeleton shape="rows" count={4} aria-label="Loading refreshes" />;
  if (!selected) {
    return <EmptyState icon={<History className="h-5 w-5" />} title="No refreshes yet" line="Refresh the table to see what changed." />;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-changes-panel="">
      <RunList runs={runs} selected={selected} onPick={setPicked} />
      <RunChanges jobId={selected} organizationId={organizationId} />
    </div>
  );
}

function RunList({ runs, selected, onPick }: { runs: RefreshRun[]; selected: string; onPick: (id: string) => void }) {
  const { toPoints } = useCostDisplay();
  return (
    <ul className="flex max-h-40 shrink-0 flex-col overflow-y-auto border-b border-border" aria-label="Refreshes" data-refresh-history="">
      {runs.map((r) => {
        const parts = summaryParts(r.summary);
        const points = r.costUsd == null ? null : toPoints(r.costUsd);
        return (
          <li key={r.jobId}>
            <button
              type="button"
              onClick={() => onPick(r.jobId)}
              aria-current={r.jobId === selected}
              data-refresh-run={r.jobId}
              className={`flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-muted ${r.jobId === selected ? "bg-muted" : ""}`}
            >
              <span className="shrink-0 tabular-nums text-foreground">{when(r.at)}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{parts ? parts.join(" · ") : r.summary?.firstFetch ? "First fetch" : "Not recorded"}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{points == null ? "—" : formatPoints(points)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RunChanges({ jobId, organizationId }: { jobId: string; organizationId: string | null }) {
  const read = useJobChanges(jobId, organizationId);
  const set = read.data ?? null;
  const [tab, setTab] = useState<ChangesTab | null>(null);
  useEffect(() => setTab(null), [jobId]);
  if (read.isLoading) return <RegionSkeleton shape="rows" count={5} aria-label="Loading changes" />;
  if (read.error || !set) {
    return <EmptyState icon={<History className="h-5 w-5" />} title="Could not load this refresh" line={read.error instanceof Error ? read.error.message : "Try again."} />;
  }
  if (set.error) return <EmptyState icon={<History className="h-5 w-5" />} title="Changes were not worked out" line={set.error} />;
  if (!set.summary) return <EmptyState icon={<History className="h-5 w-5" />} title="No changes recorded" line="This fetch ran before changes were kept." />;
  const counts = tabCounts(set.summary);
  const active = tab ?? firstTab(set.summary);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <Tabs<ChangesTab>
        value={active}
        onValueChange={setTab}
        aria-label="Kind of change"
        data={[
          { value: "added", label: "New", count: counts.added },
          { value: "changed", label: "Changed", count: counts.changed },
          { value: "gone", label: "Gone", count: counts.gone },
        ]}
      />
      {!hasChanges(set.summary) && !set.summary.firstFetch && (
        <p className="px-2 text-xs text-muted-foreground" data-no-changes="">
          Nothing changed: {set.summary.unchanged.toLocaleString()} rows came back the same.
        </p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto" data-changes-list={active}>
        {active === "added" && <KeyList rows={set.added} empty="No new rows" />}
        {active === "changed" && <ChangedList rows={set.changed} />}
        {active === "gone" &&
          (set.summary.gone == null ? (
            <p className="px-2 py-1 text-xs text-muted-foreground" data-gone-note="">
              {set.goneNote ?? "Which rows are gone was not judged for this refresh."}
            </p>
          ) : (
            <KeyList rows={set.gone} empty="No rows gone" />
          ))}
        {set.truncated && <p className="px-2 py-1 text-[11px] text-muted-foreground">The lists show the first rows; the counts above are complete.</p>}
      </div>
    </div>
  );
}

function KeyList({ rows, empty }: { rows: ChangedKey[]; empty: string }) {
  if (rows.length === 0) return <p className="px-2 py-1 text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col">
      {rows.map((r) => (
        <li key={r.key} className="flex items-baseline gap-2 border-b border-border px-2 py-1 text-xs" data-change-row={r.key}>
          <span className="min-w-0 flex-1 truncate text-foreground">{r.label ?? r.key}</span>
          {r.label && <span className="max-w-[40%] shrink-0 truncate text-muted-foreground">{r.key}</span>}
        </li>
      ))}
    </ul>
  );
}

function ChangedList({ rows }: { rows: ChangedRow[] }) {
  if (rows.length === 0) return <p className="px-2 py-1 text-xs text-muted-foreground">No changed rows</p>;
  return (
    <ul className="flex flex-col">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-0.5 border-b border-border px-2 py-1.5 text-xs" data-change-row={r.key}>
          <span className="truncate font-medium text-foreground">{r.label ?? r.key}</span>
          {r.fields.map((f) => (
            <FieldChange key={f.field} field={f} />
          ))}
          {r.fieldsTotal > r.fields.length && <span className="text-[11px] text-muted-foreground">+{r.fieldsTotal - r.fields.length} more fields</span>}
        </li>
      ))}
    </ul>
  );
}

function FieldChange({ field }: { field: ChangedField }) {
  const d = fieldDelta(field);
  return (
    <span className="flex min-w-0 items-baseline gap-1.5" data-field-change={field.field}>
      <span className="shrink-0 text-muted-foreground">{field.field}</span>
      <span className="min-w-0 truncate text-muted-foreground line-through decoration-muted-foreground/40" title={showValue(field.before)}>
        {showValue(field.before)}
      </span>
      <span className="shrink-0 text-muted-foreground">→</span>
      <span className="min-w-0 truncate text-foreground" title={showValue(field.after)}>
        {showValue(field.after)}
      </span>
      {d.delta && <span className={`shrink-0 tabular-nums ${DELTA_CLASS[d.direction]}`}>{d.delta}</span>}
    </span>
  );
}
