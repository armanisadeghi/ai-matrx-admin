"use client";

/**
 * Requests — every request in the flow, in order: the page's own calls (client → server) and every
 * external call the workflow's steps made on the server (search engines, page fetches, the scraper,
 * social lookups). Each row opens the exact request and the exact response, untouched.
 *
 * Hundreds of calls stay findable: one search over each row and its stored request and response
 * (words AND-ed, "-word" excludes), source / status / step / kind narrowing, sort by time or
 * duration, matched words marked, ↑/↓ to walk the list and "/" to jump to the search.
 */

import { useRef, type KeyboardEvent } from "react";
import { Badge, Button, SearchField, SegmentedControl, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { msText, type RequestRow } from "../requests";
import {
  EMPTY_REQUEST_FIND,
  findRequests,
  isFindActive,
  sourceOf,
  tally,
  type MatchPlace,
  type RequestFind,
  type RequestSort,
  type RequestStatusFilter,
} from "../find";
import { BuilderJson } from "./BuilderJson";
import { BuilderHighlight } from "./BuilderHighlight";

export type RequestFilter = "all" | "page" | "server";

/** Radix Select refuses "" as a value; this stands for "every". */
const ANY = "*";

const STATUS_OPTIONS: SelectOption<RequestStatusFilter>[] = [
  { value: "any", label: "Any status" },
  { value: "ok", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "slow", label: "Slow (2 s+)" },
];

const SORT_OPTIONS: SelectOption<RequestSort>[] = [
  { value: "time", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "slowest", label: "Slowest first" },
];

const PLACE_LABEL: Record<Exclude<MatchPlace, "row">, string> = { request: "in request", response: "in response" };

function statusTone(row: RequestRow): "success" | "warning" | "destructive" | "neutral" {
  if (row.error) return "destructive";
  if (typeof row.status === "number") return row.status < 300 ? "success" : row.status < 400 ? "warning" : "destructive";
  return "neutral";
}

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function options(all: string, list: { value: string; count: number }[], labelOf: (v: string) => string = (v) => v): SelectOption<string>[] {
  return [{ value: ANY, label: all }, ...list.map((t) => ({ value: t.value, label: labelOf(t.value), meta: String(t.count) }))];
}

export function BuilderRequestsTab({
  rows,
  selectedId,
  onSelect,
  filter,
  onFilter,
  find,
  onFind,
  stepLabels,
  error,
}: {
  rows: RequestRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: RequestFilter;
  onFilter: (f: RequestFilter) => void;
  find: RequestFind;
  onFind: (f: RequestFind) => void;
  /** Workflow step id → its label. */
  stepLabels: Record<string, string>;
  error: string | null;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const sided = rows.filter((r) => filter === "all" || r.side === filter);
  const found = findRequests(sided, find, stepLabels);
  const selected = found.find((f) => f.row.id === selectedId)?.row ?? found[0]?.row ?? null;
  const active = isFindActive(find);

  const sources = tally(sided, sourceOf);
  const kinds = tally(sided, (r) => r.kind);
  const steps = tally(sided, (r) => r.nodeId);
  const set = (patch: Partial<RequestFind>) => onFind({ ...find, ...patch });

  const move = (by: number) => {
    if (!found.length) return;
    const at = found.findIndex((f) => f.row.id === selected?.id);
    const next = found[Math.min(found.length - 1, Math.max(0, at + by))].row;
    onSelect(next.id);
    listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable='true'], .cm-editor");
    if (e.key === "/" && !typing) {
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (typing && e.target !== searchRef.current) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Escape" && e.target === searchRef.current && find.query) {
      e.preventDefault();
      set({ query: "" });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
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
        <SearchField
          ref={searchRef}
          aria-label="Search calls"
          placeholder="Search calls, URLs, bodies…  ( / )"
          value={find.query}
          onChange={(e) => set({ query: e.target.value })}
          className="min-w-48 flex-1"
        />
        {sources.length > 1 ? (
          <Select
            aria-label="Source"
            className="w-32 shrink-0"
            value={find.source || ANY}
            onValueChange={(v) => set({ source: v === ANY ? "" : v })}
            options={options("All sources", sources)}
          />
        ) : null}
        <Select
          aria-label="Status"
          className="w-32 shrink-0"
          value={find.status}
          onValueChange={(v) => set({ status: v })}
          options={STATUS_OPTIONS}
        />
        {steps.length > 1 ? (
          <Select
            aria-label="Step"
            className="w-40 shrink-0"
            value={find.step || ANY}
            onValueChange={(v) => set({ step: v === ANY ? "" : v })}
            options={options("All steps", steps, (id) => stepLabels[id] ?? id)}
          />
        ) : null}
        {kinds.length > 1 ? (
          <Select
            aria-label="Kind"
            className="w-32 shrink-0"
            value={find.kind || ANY}
            onValueChange={(v) => set({ kind: v === ANY ? "" : v })}
            options={options("All kinds", kinds, (k) => k.replace(/_/g, " "))}
          />
        ) : null}
        <Select aria-label="Sort" className="w-32 shrink-0" value={find.sort} onValueChange={(v) => set({ sort: v })} options={SORT_OPTIONS} />
        {active ? (
          <>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {found.length} of {sided.length}
            </span>
            <Button variant="quiet" onClick={() => onFind({ ...EMPTY_REQUEST_FIND, sort: find.sort })}>
              Clear
            </Button>
          </>
        ) : null}
        {error ? <span className="truncate text-xs text-destructive">{error}</span> : null}
      </div>
      {!sided.length ? (
        <p className="p-3 text-xs text-muted-foreground">No request yet</p>
      ) : !found.length ? (
        <p className="p-3 text-xs text-muted-foreground">No call matches</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ol
            ref={listRef}
            aria-label="Calls"
            className="max-h-[40%] min-h-0 shrink-0 overflow-auto border-b border-border md:max-h-none md:w-[42%] md:border-b-0 md:border-r"
          >
            {found.map(({ row: r, place }) => (
              <li key={r.id}>
                <button
                  type="button"
                  data-clickable
                  data-row-id={r.id}
                  onClick={() => onSelect(r.id)}
                  aria-current={selected?.id === r.id ? "true" : undefined}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 border-b border-border px-2 py-1 text-left hover:bg-accent/60",
                    selected?.id === r.id && "bg-accent",
                  )}
                >
                  <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{clock(r.at)}</span>
                  <Badge tone={r.side === "server" ? "info" : "neutral"}>{sourceOf(r)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    <BuilderHighlight text={r.title} query={find.query} />
                  </span>
                  {place !== "row" ? <span className="shrink-0 text-[10px] text-muted-foreground">{PLACE_LABEL[place]}</span> : null}
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
                {selected.nodeId ? <span className="font-mono">step {stepLabels[selected.nodeId] ?? selected.nodeId}</span> : null}
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
