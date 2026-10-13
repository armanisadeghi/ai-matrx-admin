"use client";

/**
 * Requests — every request in the flow, in order: the page's own calls (client → server) and every
 * external call the workflow's steps made on the server (search engines, page fetches, the scraper,
 * social lookups). Each row opens the exact request and the exact response, untouched.
 */


import { Badge, SegmentedControl } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { msText, type RequestRow } from "../requests";
import { BuilderJson } from "./BuilderJson";

export type RequestFilter = "all" | "page" | "server";

function statusTone(row: RequestRow): "success" | "warning" | "destructive" | "neutral" {
  if (row.error) return "destructive";
  if (typeof row.status === "number") return row.status < 300 ? "success" : row.status < 400 ? "warning" : "destructive";
  return "neutral";
}

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function BuilderRequestsTab({
  rows,
  selectedId,
  onSelect,
  filter,
  onFilter,
  error,
}: {
  rows: RequestRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: RequestFilter;
  onFilter: (f: RequestFilter) => void;
  error: string | null;
}) {
  const shown = rows.filter((r) => filter === "all" || r.side === filter);
  const selected = shown.find((r) => r.id === selectedId) ?? shown[0] ?? null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <SegmentedControl
          aria-label="Requests from"
          value={filter}
          onValueChange={(v) => onFilter(v as RequestFilter)}
          data={[
            { value: "all", label: `All ${rows.length}` },
            { value: "page", label: `Page ${rows.filter((r) => r.side === "page").length}` },
            { value: "server", label: `Server ${rows.filter((r) => r.side === "server").length}` },
          ]}
        />
        {error ? <span className="truncate text-xs text-destructive">{error}</span> : null}
      </div>
      {!shown.length ? (
        <p className="p-3 text-xs text-muted-foreground">No request yet</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ol className="max-h-[40%] min-h-0 shrink-0 overflow-auto border-b border-border md:max-h-none md:w-[42%] md:border-b-0 md:border-r">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  data-clickable
                  onClick={() => onSelect(r.id)}
                  aria-current={selected?.id === r.id ? "true" : undefined}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 border-b border-border px-2 py-1 text-left hover:bg-accent/60",
                    selected?.id === r.id && "bg-accent",
                  )}
                >
                  <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{clock(r.at)}</span>
                  <Badge tone={r.side === "server" ? "info" : "neutral"}>{r.side === "server" ? r.provider || "server" : "page"}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs">{r.title}</span>
                  <Badge tone={statusTone(r)}>{r.error ? "error" : (r.status ?? "…")}</Badge>
                  <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                    {r.ms !== null ? msText(r.ms) : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="font-mono">{selected.kind}</span>
                {selected.nodeId ? <span className="font-mono">step {selected.nodeId}</span> : null}
                {selected.runId ? <span className="truncate font-mono">run {selected.runId}</span> : null}
                {selected.error ? <span className="text-destructive">{selected.error}</span> : null}
              </div>
              <BuilderJson data={selected.request} label="Request" location={`Requests · ${selected.title} · request`} className="h-[38%] min-h-40 shrink-0" />
              <BuilderJson data={selected.response} label="Response" location={`Requests · ${selected.title} · response`} className="min-h-64 flex-1" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
