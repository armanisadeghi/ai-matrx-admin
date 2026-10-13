"use client";

/** Activity — what was done, in order: each request, each step, gates, provision captures; with
 *  time and cost, each opening its raw record. */


import { Badge } from "@ai-matrx/design-system/controls";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { msText, type ActivityRow } from "../requests";

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
}: {
  rows: ActivityRow[];
  onOpenRequest: (id: string) => void;
  onOpenStep: (runId: string, nodeId: string | null) => void;
  onOpenSnapshot: (id: string) => void;
}) {
  const { format } = useCostDisplay();
  if (!rows.length) return <p className="p-3 text-xs text-muted-foreground">Nothing done yet</p>;
  const total = rows.reduce((n, r) => n + (r.costUsd ?? 0), 0);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{rows.length} events</span>
        <span className="tabular-nums">Cost {format(total)}</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-auto">
        {rows.map((r) => {
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
                <span className="min-w-0 flex-1 truncate text-xs">{r.title}</span>
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
