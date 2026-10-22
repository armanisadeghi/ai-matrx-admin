"use client";

/**
 * Earlier runs of a source (or of every source a task uses), newest first, in the canonical table.
 * A row reopens that run's results inline on the same page (`onOpen`). No price: a run list is a
 * record of doing (law 14).
 */

import { MatrxDataTable, type MatrxColumnDef, type MatrxDataTableCopyConfig } from "@ai-matrx/design-system/data-table";

import { inputsText, runStatusLabel, usePastRuns, type FetchJobRow } from "./runHistory";
import { durationWords } from "./runTiming";

interface PastRunRow {
  id: string;
  sourceKey: string;
  source: string;
  asked: string;
  records: number;
  status: string;
  createdAt: string;
  /** How long it took, in seconds (sorts and filters as a number). */
  tookSeconds: number | null;
}

const toRow = (j: FetchJobRow, labelOf: (key: string) => string): PastRunRow => ({
  id: j.id,
  sourceKey: j.source_key,
  source: labelOf(j.source_key),
  asked: inputsText(j.inputs),
  records: (j.rows_created ?? 0) + (j.rows_updated ?? 0),
  status: runStatusLabel(j.status),
  createdAt: j.created_at,
  tookSeconds: j.duration_ms != null ? Math.round(j.duration_ms / 1000) : null,
});

export function PastRuns({
  sourceKeys,
  labelOf,
  showSource = false,
  onOpen,
}: {
  sourceKeys: readonly string[];
  labelOf: (key: string) => string;
  /** A task's list spans several sources: show which one each run used. */
  showSource?: boolean;
  onOpen: (run: { id: string; sourceKey: string }) => void;
}) {
  const runs = usePastRuns(sourceKeys);
  const rows = (runs.data ?? []).map((j) => toRow(j, labelOf));
  if (!runs.isLoading && rows.length === 0) return null;
  const columns: MatrxColumnDef<PastRunRow>[] = [
    { id: "createdAt", header: "When", accessorKey: "createdAt", format: { id: "datetime" }, width: 170, defaultSortDirection: "desc" },
    ...(showSource ? [{ id: "source", header: "Source", accessorKey: "source" as const, filter: "select" as const, width: 200 }] : []),
    { id: "asked", header: "Asked for", accessorKey: "asked", filter: "text", width: 280 },
    { id: "records", header: "Records", accessorKey: "records", format: { id: "integer" }, width: 100 },
    { id: "tookSeconds", header: "Took", accessorKey: "tookSeconds", cell: (r) => (r.tookSeconds == null ? "—" : durationWords(r.tookSeconds * 1000)), copyValue: (r) => (r.tookSeconds == null ? "" : durationWords(r.tookSeconds * 1000)), width: 110 },
    { id: "status", header: "Status", accessorKey: "status", format: { id: "choice" }, width: 110 },
  ];
  const copy: MatrxDataTableCopyConfig<PastRunRow> = {
    label: "Data run",
    listLabel: "Past data runs (this view)",
    location: "Data library — past runs",
    rowKind: "data-fetch-run",
    listKind: "data-fetch-run-list",
    rowDescription: "One data library run: when, source, what it asked for, records, how long it took and status.",
    listDescription: "Earlier runs of this data library task or source, newest first.",
    humanRow: (r) => [`When: ${r.createdAt}`, `Source: ${r.source}`, `Asked for: ${r.asked}`, `Records: ${r.records}`, `Took: ${r.tookSeconds == null ? "—" : durationWords(r.tookSeconds * 1000)}`, `Status: ${r.status}`].join("\n"),
  };
  return (
    <section className="flex flex-col gap-2" aria-label="Past runs" data-past-runs="">
      <MatrxDataTable<PastRunRow>
        tableId="data-library/past-runs"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        isLoading={runs.isLoading}
        pageSize={10}
        density="condensed"
        viewTabs={false}
        toolbar={{ title: "Past runs", searchPlaceholder: "Search runs" }}
        detail={{ enabled: false }}
        copy={copy}
        onRowOpen={(r: PastRunRow) => onOpen({ id: r.id, sourceKey: r.sourceKey })}
        emptyState={{ title: "No runs yet" }}
      />
    </section>
  );
}
