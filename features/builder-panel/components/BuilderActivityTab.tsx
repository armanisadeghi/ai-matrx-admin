"use client";

/** Activity — what was done, in order: each request, each step, gates, provision captures; with
 *  time and cost, each opening its raw record. One search and a kind filter narrow long runs. */


import { Badge, SearchField, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { msText, type ActivityRow } from "../requests";
import { findActivity, tally } from "../find";
import { BuilderHighlight } from "./BuilderHighlight";

const ANY = "*";

const KIND_TONE: Record<string, "neutral" | "info" | "success" | "warning"> = {
  request: "info",
  step: "success",
  gate: "warning",
  provision: "neutral",
  run: "neutral",
};

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function BuilderActivityTab({
  rows,
  onOpenRequest,
  onOpenStep,
  onOpenSnapshot,
  query,
  onQuery,
  kind,
  onKind,
}: {
  rows: ActivityRow[];
  query: string;
  onQuery: (q: string) => void;
  /** "" = every kind. */
  kind: string;
  onKind: (k: string) => void;
  onOpenRequest: (id: string) => void;
  onOpenStep: (runId: string, nodeId: string | null) => void;
  onOpenSnapshot: (id: string) => void;
}) {
  const { format } = useCostDisplay();
  if (!rows.length) return <p className="p-3 text-xs text-muted-foreground">Nothing done yet</p>;
  const shown = findActivity(rows, query, kind);
  const total = shown.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  const kinds: SelectOption<string>[] = [
    { value: ANY, label: "All events" },
    ...tally(rows, (r) => r.kind).map((t) => ({ value: t.value, label: t.value, meta: String(t.count) })),
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <SearchField
          aria-label="Search activity"
          placeholder="Search activity…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="min-w-48 flex-1"
        />
        <Select
          aria-label="Event kind"
          className="w-32 shrink-0"
          value={kind || ANY}
          onValueChange={(v) => onKind(v === ANY ? "" : v)}
          options={kinds}
        />
        <span className="tabular-nums">{shown.length === rows.length ? `${rows.length} events` : `${shown.length} of ${rows.length} events`}</span>
        <span className="tabular-nums">Cost {format(total)}</span>
      </div>
      {!shown.length ? <p className="p-3 text-xs text-muted-foreground">No event matches</p> : null}
      <ol className="min-h-0 flex-1 overflow-auto">
        {shown.map((r) => {
          const open = r.requestId
            ? () => onOpenRequest(r.requestId as string)
            : r.snapshotId
              ? () => onOpenSnapshot(r.snapshotId as string)
              : r.runId
                ? () => onOpenStep(r.runId as string, r.nodeId)
                : null;
          return (
            <li key={r.id}>
              <button
                type="button"
                data-clickable
                disabled={!open}
                onClick={open ?? undefined}
                className="flex w-full min-w-0 items-center gap-2 border-b border-border px-3 py-1 text-left hover:bg-accent/60"
              >
                <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{clock(r.at)}</span>
                <Badge tone={KIND_TONE[r.kind] ?? "neutral"}>{r.kind}</Badge>
                <span className="min-w-0 flex-1 truncate text-xs">
                  <BuilderHighlight text={r.title} query={query} />
                </span>
                {r.status ? <span className="shrink-0 text-[10px] text-muted-foreground">{r.status}</span> : null}
                <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {r.ms !== null ? msText(r.ms) : ""}
                </span>
                <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {r.costUsd ? format(r.costUsd) : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
