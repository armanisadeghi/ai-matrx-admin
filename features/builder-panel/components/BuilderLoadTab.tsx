"use client";

/**
 * Page load — every database call this page made, grouped by what it read, with WHEN it left
 * (before the first paint, while the page settled, after it settled), how many times, and the code
 * that asked. THE LOAD LAW (lib/diagnostics/loadLedger.ts): only what the page shows leaves before
 * it settles; a read that repeats or fires for nothing on screen is a defect.
 */

import { useState, useSyncExternalStore } from "react";
import { Badge, Select } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import {
  callerFrames,
  getLoadCalls,
  getLoads,
  subscribeLoadLedger,
  type LoadCall,
  type LoadInfo,
  type LoadPhase,
} from "@/lib/diagnostics/loadLedger";

const NO_CALLS: LoadCall[] = [];
const NO_LOADS: LoadInfo[] = [];

const PHASE_LABEL: Record<LoadPhase, string> = {
  "first-paint": "Before paint",
  settling: "Settling",
  settled: "Settled",
};
const PHASE_TONE: Record<LoadPhase, "warning" | "info" | "neutral"> = {
  "first-paint": "warning",
  settling: "info",
  settled: "neutral",
};

interface Group {
  key: string;
  label: string;
  operation: string;
  calls: LoadCall[];
}

function groupCalls(calls: LoadCall[]): Group[] {
  const map = new Map<string, Group>();
  for (const call of calls) {
    const key = `${call.operation} ${call.schema}.${call.relation}`;
    let group = map.get(key);
    if (!group) {
      group = { key, label: `${call.schema}.${call.relation}`, operation: call.operation, calls: [] };
      map.set(key, group);
    }
    group.calls.push(call);
  }
  return [...map.values()].sort((a, b) => a.calls[0].at - b.calls[0].at);
}

export function BuilderLoadTab() {
  const calls = useSyncExternalStore(subscribeLoadLedger, getLoadCalls, () => NO_CALLS);
  const loads = useSyncExternalStore(subscribeLoadLedger, getLoads, () => NO_LOADS);
  const [loadPick, setLoadPick] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const latest = loads[loads.length - 1] ?? null;
  const load = loads.find((l) => l.load === loadPick) ?? latest;
  if (!load) return <p className="p-3 text-xs text-muted-foreground">No page load recorded</p>;

  const mine = calls.filter((c) => c.load === load.load);
  const groups = groupCalls(mine);
  const repeated = groups.filter((g) => g.calls.length > 1).length;
  const byPhase = (phase: LoadPhase) => mine.filter((c) => c.phase === phase).length;
  const open = groups.find((g) => g.key === openKey) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
        <Select
          aria-label="Page load"
          value={String(load.load)}
          onValueChange={(v) => setLoadPick(Number(v))}
          options={[...loads].reverse().map((l) => ({ value: String(l.load), label: `${l.route} · #${l.load}` }))}
        />
        <Badge tone="neutral">{mine.length} calls</Badge>
        <Badge tone="warning">{byPhase("first-paint")} before paint</Badge>
        <Badge tone="info">{byPhase("settling")} settling</Badge>
        <Badge tone="neutral">{byPhase("settled")} settled</Badge>
        {repeated ? <Badge tone="destructive">{repeated} repeated</Badge> : null}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {load.settledAt === null ? "Not settled" : `Settled at ${Math.round(load.settledAt)} ms`}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ol className="max-h-[50%] min-h-0 shrink-0 overflow-auto border-b border-border md:max-h-none md:w-[64%] md:border-b-0 md:border-r">
          {groups.map((g) => {
            const first = g.calls[0];
            return (
              <li key={g.key}>
                <button
                  type="button"
                  data-clickable
                  onClick={() => setOpenKey(g.key)}
                  aria-current={open?.key === g.key ? "true" : undefined}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 border-b border-border px-2 py-1 text-left hover:bg-accent/60",
                    open?.key === g.key && "bg-accent",
                  )}
                >
                  <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                    {first.at} ms
                  </span>
                  <Badge tone={PHASE_TONE[first.phase]}>{PHASE_LABEL[first.phase]}</Badge>
                  <span className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground">{g.operation}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{g.label}</span>
                  {g.calls.length > 1 ? <Badge tone="destructive">×{g.calls.length}</Badge> : null}
                </button>
              </li>
            );
          })}
        </ol>
        {open ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
            <span className="font-mono text-xs">{open.key}</span>
            {open.calls.map((call) => (
              <div key={call.seq} className="flex flex-col gap-0.5 border-b border-border pb-1.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono tabular-nums">{call.at} ms</span>
                  <Badge tone={PHASE_TONE[call.phase]}>{PHASE_LABEL[call.phase]}</Badge>
                </div>
                {call.args ? (
                  <code className="break-all font-mono text-[10px] leading-4 text-muted-foreground">{call.args}</code>
                ) : null}
                <pre className="overflow-x-auto whitespace-pre font-mono text-[10px] leading-4 text-foreground">
                  {callerFrames(call).slice(0, 14).join("\n")}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-3 text-xs text-muted-foreground">Pick a call to see what asked for it</p>
        )}
      </div>
    </div>
  );
}
