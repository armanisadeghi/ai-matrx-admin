"use client";

/**
 * Watch AI · Everything: the platform-wide live feed of recent AI runs (see `everything-feed.ts`).
 * Mounted only while the person has Everything switched on, so nothing is read before that. The
 * newest page re-reads when a run changes (realtime); older runs page in on request (server-side keyset).
 */

import { fetchMandateLabels } from "@/features/admin/spend-alarms/spendAlarms";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { originClassLabel } from "@ai-matrx/chat/agents/redux/conversation-history/source-registry";
import { Checkbox, cn, ErrorNotice, displayId } from "@ai-matrx/design-system";
import { Button, Select } from "@ai-matrx/design-system/controls";
import {
  EVERYTHING_PAGE_SIZE,
  NO_FILTERS,
  fetchAgentNames,
  fetchEverythingNames,
  fetchEverythingPage,
  mergeEverything,
  rowTitle,
  agentLabel,
  humanizeFeature,
  type EverythingFilters,
  type EverythingRow,
} from "./everything-feed";
import { useUserRequestChanges } from "./useUserRequestChanges";

const LIVE_STATUSES = new Set(["pending", "running", "streaming"]);

const ANY = "__any__";

/** One filter: "any" plus what the feed has shown so far. The design-system Select, never a native one. */
function FilterSelect({ label, any, value, onChange, options }: {
  label: string;
  any: string;
  value: string | null;
  onChange: (next: string | null) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value ?? ANY}
      onValueChange={(v) => onChange(v === ANY ? null : v)}
      aria-label={label}
      className="min-w-0 flex-1"
      options={[{ value: ANY, label: any }, ...options]}
    />
  );
}

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
  const [namesError, setNamesError] = useState<string | null>(null);
  const [mandateLabels, setMandateLabels] = useState<Record<string, string>>({});
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
    const nameFailed = (err: unknown) => setNamesError(err instanceof Error ? err.message : String(err));
    void fetchEverythingNames([...s.people], [...s.orgs]).then(setNames, nameFailed);
    void fetchMandateLabels([...s.mandates]).then((m) => setMandateLabels((cur) => ({ ...cur, ...Object.fromEntries(m) })), nameFailed);
    void fetchAgentNames([...s.agents.keys()]).then((n) => setAgentNames((cur) => ({ ...cur, ...n })), nameFailed);
  }, []);

  // New filters start the feed over; the newest page then re-reads whenever a run changes (realtime, no timer).
  const refreshRef = useRef<() => void>(() => undefined);
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
    refreshRef.current = () => void load(false);
    void load(true);
    return () => {
      cancelled = true;
      refreshRef.current = () => undefined;
    };
  }, [filterSig, learn]);
  useUserRequestChanges({ scope: "everything", enabled: true, refresh: () => refreshRef.current() });

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
          <FilterSelect label="Person" any="Everyone" value={filters.personId} onChange={(v) => set({ personId: v })}
            options={[...s.people].map((id) => ({ value: id, label: names.people[id] ?? displayId(id) }))} />
          <FilterSelect label="Organization" any="Any organization" value={filters.organizationId} onChange={(v) => set({ organizationId: v })}
            options={[...s.orgs].map((id) => ({ value: id, label: names.organizations[id] ?? displayId(id) }))} />
        </div>
        <div className={cn("flex gap-1", !framed && "flex-wrap")}>
          <FilterSelect label="Door" any="Any door" value={filters.originClass} onChange={(v) => set({ originClass: v })}
            options={[...s.origins].map((o) => ({ value: o, label: originClassLabel(o) }))} />
          <FilterSelect label="Mandate" any="Any mandate" value={filters.mandateKey} onChange={(v) => set({ mandateKey: v })}
            options={[...s.mandates].map((m) => ({ value: m, label: mandateLabels[m] ?? humanizeFeature(m) }))} />
        </div>
        <div className="flex items-center gap-1">
          <FilterSelect label="Agent" any="Any agent" value={filters.agentId} onChange={(v) => set({ agentId: v })}
            options={[...s.agents].map(([id, name]) => ({ value: id, label: agentLabel(agentNames[id] ?? name) }))} />
          <label className="flex shrink-0 items-center gap-1 text-muted-foreground">
            <Checkbox checked={filters.backgroundOnly} aria-label="Background only" onCheckedChange={(next) => set({ backgroundOnly: next === true })} />
            Background only
          </label>
          {anyFilter ? (
            <Button variant="quiet" className="shrink-0" onClick={() => setFilters(NO_FILTERS)}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="p-2">
          <ErrorNotice title="The runs could not be read" message={error} />
        </div>
      ) : null}
      {namesError ? (
        <div className="p-2">
          <ErrorNotice title="Some names could not be read" message={namesError} />
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
              <span className="truncate" title={rowTitle(r, agentNames, mandateLabels)}>{rowTitle(r, agentNames, mandateLabels)}</span>
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
        <Button variant="quiet" className="justify-start" onClick={() => void older()}>
          Older runs
        </Button>
      ) : null}
    </div>
  );
}
