"use client";

/**
 * Watch AI · Everything: the platform-wide live feed of recent AI runs (see `everything-feed.ts`).
 * Mounted only while the person has Everything switched on, so nothing is read before that. The
 * newest page refreshes every few seconds; older runs page in on request (server-side keyset).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { originClassLabel } from "@ai-matrx/chat/agents/redux/conversation-history/source-registry";
import { cn, ErrorNotice, displayId } from "@ai-matrx/design-system";
import {
  EVERYTHING_PAGE_SIZE,
  NO_FILTERS,
  fetchAgentNames,
  fetchEverythingNames,
  fetchEverythingPage,
  mergeEverything,
  rowTitle,
  type EverythingFilters,
  type EverythingRow,
} from "./everything-feed";

const REFRESH_MS = 4000;
const LIVE_STATUSES = new Set(["pending", "running", "streaming"]);

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function EverythingFeed({
  selectedId,
  onSelect,
  framed,
}: {
  selectedId: string | null;
  onSelect: (userRequestId: string) => void;
  framed: boolean;
}) {
  const [filters, setFilters] = useState<EverythingFilters>(NO_FILTERS);
  const [rows, setRows] = useState<EverythingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [names, setNames] = useState<{ people: Record<string, string>; organizations: Record<string, string> }>({ people: {}, organizations: {} });
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  // The options of each filter are what the feed has shown so far; picking one re-reads on the server.
  const seen = useRef({ people: new Set<string>(), orgs: new Set<string>(), origins: new Set<string>(), mandates: new Set<string>(), agents: new Map<string, string>() });
  const [, bump] = useState(0);
  const filterSig = JSON.stringify(filters);

  const learn = useCallback((page: EverythingRow[]) => {
    const s = seen.current;
    for (const r of page) {
      if (r.personId) s.people.add(r.personId);
      if (r.organizationId) s.orgs.add(r.organizationId);
      if (r.originClass) s.origins.add(r.originClass);
      if (r.mandateKey) s.mandates.add(r.mandateKey);
      if (r.agentId) s.agents.set(r.agentId, r.agentName ?? displayId(r.agentId));
    }
    bump((n) => n + 1);
    void fetchEverythingNames([...s.people], [...s.orgs]).then(setNames, () => undefined);
    void fetchAgentNames([...s.agents.keys()]).then((n) => setAgentNames((cur) => ({ ...cur, ...n })), () => undefined);
  }, []);

  // New filters start the feed over; the newest page then refreshes on a timer.
  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setMore(true);
    setLoading(true);
    const load = async (first: boolean) => {
      try {
        const page = await fetchEverythingPage(JSON.parse(filterSig) as EverythingFilters, null);
        if (cancelled) return;
        setRows((cur) => mergeEverything(cur, page));
        if (first) setMore(page.length === EVERYTHING_PAGE_SIZE);
        setError(null);
        learn(page);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load(true);
    const timer = setInterval(() => void load(false), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [filterSig, learn]);

  const older = async () => {
    const last = rows.at(-1);
    if (!last) return;
    try {
      const page = await fetchEverythingPage(filters, last.createdAt);
      setRows((cur) => mergeEverything(cur, page));
      setMore(page.length === EVERYTHING_PAGE_SIZE);
      learn(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const s = seen.current;
  const set = (patch: Partial<EverythingFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const anyFilter = useMemo(() => JSON.stringify(filters) !== JSON.stringify(NO_FILTERS), [filters]);
  const selectCls = "min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5 text-xs";

  return (
    <div className="flex min-h-0 flex-col" data-testid="ai-watch-everything">
      <div className="flex flex-col gap-1 border-b border-border p-2">
        <div className={cn("flex gap-1", !framed && "flex-wrap")}>
          <select aria-label="Person" className={selectCls} value={filters.personId ?? ""} onChange={(e) => set({ personId: e.target.value || null })}>
            <option value="">Everyone</option>
            {[...s.people].map((id) => <option key={id} value={id}>{names.people[id] ?? displayId(id)}</option>)}
          </select>
          <select aria-label="Organization" className={selectCls} value={filters.organizationId ?? ""} onChange={(e) => set({ organizationId: e.target.value || null })}>
            <option value="">Any organization</option>
            {[...s.orgs].map((id) => <option key={id} value={id}>{names.organizations[id] ?? displayId(id)}</option>)}
          </select>
        </div>
        <div className={cn("flex gap-1", !framed && "flex-wrap")}>
          <select aria-label="Door" className={selectCls} value={filters.originClass ?? ""} onChange={(e) => set({ originClass: e.target.value || null })}>
            <option value="">Any door</option>
            {[...s.origins].map((o) => <option key={o} value={o}>{originClassLabel(o)}</option>)}
          </select>
          <select aria-label="Mandate" className={selectCls} value={filters.mandateKey ?? ""} onChange={(e) => set({ mandateKey: e.target.value || null })}>
            <option value="">Any mandate</option>
            {[...s.mandates].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select aria-label="Agent" className={selectCls} value={filters.agentId ?? ""} onChange={(e) => set({ agentId: e.target.value || null })}>
            <option value="">Any agent</option>
            {[...s.agents].map(([id, name]) => <option key={id} value={id}>{agentNames[id] ?? name}</option>)}
          </select>
          <label className="flex shrink-0 items-center gap-1 text-muted-foreground">
            <input type="checkbox" checked={filters.backgroundOnly} onChange={(e) => set({ backgroundOnly: e.target.checked })} />
            Background only
          </label>
          {anyFilter ? (
            <button type="button" className="shrink-0 text-muted-foreground underline" onClick={() => setFilters(NO_FILTERS)}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="p-2">
          <ErrorNotice title="The runs could not be read" message={error} />
        </div>
      ) : null}
      {loading && rows.length === 0 ? <div className="p-2 text-muted-foreground">Reading recent runs</div> : null}
      {!loading && rows.length === 0 && !error ? <div className="p-2 text-muted-foreground">No runs match</div> : null}
      {rows.map((r) => (
        <button
          key={r.userRequestId}
          type="button"
          onClick={() => onSelect(r.userRequestId)}
          data-testid="ai-watch-everything-row"
          data-origin={r.originClass ?? ""}
          className={cn(
            "flex w-full flex-col gap-0.5 border-b border-border px-2 py-1.5 text-left hover:bg-muted",
            r.userRequestId === selectedId && "bg-muted font-medium",
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              {r.status && LIVE_STATUSES.has(r.status) ? <Eye className="h-3 w-3 shrink-0 text-orange-500" /> : null}
              <span className="truncate" title={rowTitle(r, agentNames)}>{rowTitle(r, agentNames)}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{r.status ?? ""}</span>
          </span>
          <span className="flex items-center justify-between gap-2 text-muted-foreground">
            <span className="truncate">
              {originClassLabel(r.originClass ?? "unknown")}
              {r.personId ? ` · ${names.people[r.personId] ?? displayId(r.personId)}` : ""}
            </span>
            <span className="shrink-0">{when(r.createdAt)}</span>
          </span>
        </button>
      ))}
      {more && rows.length > 0 ? (
        <button type="button" onClick={() => void older()} className="px-2 py-1.5 text-left text-muted-foreground underline">
          Older runs
        </button>
      ) : null}
    </div>
  );
}
