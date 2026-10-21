"use client";

/**
 * Smart Add bench — every result as one normalized row: where it came from, the person's truth,
 * and each system's answer with its label and probability. Sort, filter and analyze with the
 * canonical table; correct the truth in place (or take a system's answer as the truth with one
 * click) when the person realizes the system was right.
 */

import { SquareArrowOutUpRight } from "lucide-react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { StatusDot } from "@ai-matrx/design-system";
import { Button, Select } from "@ai-matrx/design-system/controls";
import type { MatrixCell } from "../../matrix/types";
import {
  SYSTEM_LABEL,
  truthLabels,
  domainOf,
  rowStatus,
  type BenchState,
  type RowStatus,
  type Stance,
  type SystemAnswer,
  type SystemKey,
  type SystemRun,
  type Truth,
} from "../model";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface ResultRow {
  key: string;
  title: string;
  url: string;
  host: string;
  hits: number;
  bestRank: number | null;
  truth: Truth | null;
  answers: Partial<Record<SystemKey, SystemAnswer | null>>;
  statuses: Partial<Record<SystemKey, RowStatus>>;
}


const STATUS_VIEW: Record<Exclude<RowStatus, "done" | "idle">, { tone: "neutral" | "info" | "danger"; label: string }> = {
  waiting: { tone: "neutral", label: "Waiting" },
  judging: { tone: "info", label: "Judging…" },
  failed: { tone: "danger", label: "Failed" },
};

function answerCell(row: ResultRow, s: SystemKey, labels: Record<Stance, string>) {
  const status = row.statuses[s] ?? "idle";
  const a = row.answers[s];
  if (status !== "done" || !a) {
    if (status === "idle") return <span className="text-muted-foreground">—</span>;
    if (status === "done") return <span className="text-muted-foreground">No answer</span>;
    const v = STATUS_VIEW[status];
    return (
      <span className="inline-flex items-center gap-1.5">
        <StatusDot tone={v.tone} />
        <span className={status === "judging" ? "animate-pulse" : undefined}>{v.label}</span>
      </span>
    );
  }
  const wrong = row.truth && a.stance !== "cant_tell" && a.stance !== row.truth;
  return <span className={wrong ? "text-destructive font-medium" : undefined}>{labels[a.stance]}</span>;
}

export function BenchResultsTable({
  bench,
  cells,
  runs,
  systems,
  onTruth,
}: {
  bench: BenchState;
  cells: MatrixCell[];
  runs: Record<SystemKey, SystemRun>;
  /** The systems that judged (empty before a run: only the results show). */
  systems: SystemKey[];
  onTruth: (key: string, truth: Truth | null) => Promise<void>;
}) {
  const labels = truthLabels(bench.subject ?? "brand");
  const TRUTH_OPTIONS = (["ours", "about_us", "not_us"] as Truth[]).map((t) => ({ value: t, label: labels[t] }));
  const STANCE_OPTIONS = (["ours", "about_us", "not_us", "cant_tell"] as Stance[]).map((t) => ({ value: t, label: labels[t] }));
  const rows: ResultRow[] = bench.results.map((r) => ({
    key: r.key,
    title: r.title || r.url,
    url: r.url,
    host: domainOf(r.url),
    hits: r.hits.length,
    bestRank: r.hits.length ? Math.min(...r.hits.map((h) => h.rank)) : null,
    truth: bench.truth[r.key] ?? null,
    answers: Object.fromEntries(systems.map((s) => [s, runs[s].answers.get(r.key) ?? null])),
    statuses: Object.fromEntries(systems.map((s) => [s, rowStatus(cells, bench, r.key, s)])),
  }));

  const columns: MatrxColumnDef<ResultRow>[] = [
    {
      id: "title",
      header: "Result",
      accessorFn: (r) => r.title,
      filter: "text",
      width: 360,
      cell: (r) => (
        <OutboundLink href={r.url} className="inline-flex items-center gap-1.5 min-w-0 hover:underline">
          <span className="truncate">{r.title}</span>
          <SquareArrowOutUpRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </OutboundLink>
      ),
    },
    { id: "host", header: "Site", accessorFn: (r) => r.host, filter: "select", width: 180 },
    { id: "hits", header: "Found", helpText: "How many searches found it", accessorFn: (r) => r.hits, filter: "number", align: "right", width: 80 },
    { id: "rank", header: "Best rank", accessorFn: (r) => r.bestRank, filter: "number", align: "right", width: 100 },
    {
      id: "truth",
      header: "Truth",
      helpText: "Your mark. Change it any time; every score recalculates at once.",
      accessorFn: (r) => r.truth ?? "",
      filter: "select",
      filterOptions: [...TRUTH_OPTIONS, { value: "", label: "Not marked" }],
      width: 150,
      // One click, saved and scored at once — no edit mode, no Save (Arman, 2026-10-17).
      cell: (r) => (
        <Select<string>
          variant="inline"
          aria-label={`Truth for ${r.title}`}
          value={r.truth ?? ""}
          options={[{ value: "", label: "—" }, ...TRUTH_OPTIONS]}
          onValueChange={(v) => void onTruth(r.key, v ? (v as Truth) : null)}
        />
      ),
    },
    ...systems.flatMap((s): MatrxColumnDef<ResultRow>[] => [
      {
        id: `${s}-answer`,
        header: SYSTEM_LABEL[s],
        accessorFn: (r) => r.answers[s]?.stance ?? r.statuses[s] ?? "",
        filter: "select",
        filterOptions: STANCE_OPTIONS,
        width: 130,
        cell: (r) => answerCell(r, s, labels),
      },
      {
        id: `${s}-label`,
        header: `${SYSTEM_LABEL[s]} label`,
        accessorFn: (r) => r.answers[s]?.label ?? "",
        filter: "select",
        width: 150,
      },
      {
        id: `${s}-p`,
        header: `${SYSTEM_LABEL[s]} %`,
        accessorFn: (r) => (r.answers[s]?.probability != null ? Math.round((r.answers[s]?.probability ?? 0) * 100) : null),
        filter: "number",
        align: "right",
        width: 100,
      },
    ]),
    ...(systems.length
      ? [
          {
            id: "agreement",
            header: "Agreement",
            helpText: "Whether every system matches your mark",
            accessorFn: (r: ResultRow) =>
              !r.truth ? "Not marked" : systems.every((s) => r.answers[s]?.stance === r.truth) ? "All right" : "Split",
            filter: "select" as const,
            width: 120,
          },
          {
            id: "fix",
            header: "Correct the truth",
            sortable: false,
            filter: false as const, // table-filter-off: action buttons, no value to filter
            width: 260,
            cell: (r: ResultRow) => (
              <span className="inline-flex flex-wrap gap-1">
                {systems.map((s) => {
                  const a = r.answers[s];
                  if (!a || a.stance === "cant_tell" || a.stance === r.truth) return null;
                  return (
                    <Button key={s} variant="quiet" onClick={() => void onTruth(r.key, a.stance as Truth)}>
                      {SYSTEM_LABEL[s]} was right
                    </Button>
                  );
                })}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <MatrxDataTable<ResultRow>
      tableId="agents/battle/smart-add/results"
      data={rows}
      columns={columns}
      getRowId={(r) => r.key}
      pageSize={0}
      detail={{ enabled: false }}
      toolbar={{ title: `${rows.length} results` }}
      emptyState={{ title: "No results yet" }}
    />
  );
}
