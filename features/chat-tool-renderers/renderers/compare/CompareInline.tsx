"use client";

import { formatDurationSeconds } from "@ai-matrx/kit/format";
import { useEffect, useMemo, useState } from "react";
import { Scale, Star } from "lucide-react";
import type { ToolRendererProps } from "@ai-matrx/chat/tool-call-visualization/types";
import { EntityCard } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared-entity/EntityCard";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";

import { cn } from "@/lib/utils";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { ItemLogo } from "@/features/comparison/components/ItemLogo";
import { Lineup } from "@/features/comparison/components/Lineup";
import { PickList } from "@/features/comparison/components/PickList";
import type { ItemProgress, ItemStage, LookupMatch } from "@/features/comparison/contract";
import { discoveryRecord } from "@/features/comparison/discovery";
import { useComparisonKinds } from "@/features/comparison/hooks";
import { inLineup, placePick, startRows, type CompareRow } from "@/features/comparison/rows";

import { CompactResult } from "./CompactResult";
import { compareStageLabel, setCompareRunPhase } from "./runStatus";
import { parseCompare, type FoundThing, type ParsedCompare } from "./parseCompare";
import { useCompareRun } from "./useCompareRun";

const STAGE_SHARE: Record<ItemStage, number> = { queued: 0.04, fetching: 0.15, reading: 0.45, storing: 0.85, done: 1 };

function FoundRow({ f, photo }: { f: FoundThing; photo: boolean }) {
  const missing = f.status !== "found" || !f.name;
  return (
    <li className="flex items-center gap-2.5" data-compare-found="">
      <ItemLogo name={f.name ?? f.typed} logoUrl={f.logoUrl} website={f.website} size={28} fill={photo} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", missing ? "text-muted-foreground" : "text-foreground")}>{f.name ?? f.typed}</div>
        <div className="type-meta truncate text-muted-foreground">{missing ? f.message ?? "Not found" : f.detail}</div>
      </div>
      {!missing && f.rating !== null ? (
        <span className="type-meta flex shrink-0 items-center gap-1 tabular-nums text-foreground">
          <Star className="h-3 w-3 fill-current text-warning" aria-hidden />{f.rating.toFixed(1)}
        </span>
      ) : null}
    </li>
  );
}

function ProgressList({ rows, found, startedAt }: { rows: ItemProgress[]; found: FoundThing[]; startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const shown = rows.length ? rows : found.filter((f) => f.status === "found").map((f, index): ItemProgress => ({
    index, label: f.name ?? f.typed, logoUrl: f.logoUrl, website: f.website, stage: "queued", stageLabel: "Waiting",
    current: null, total: null, done: false, error: null,
  }));
  const done = shown.filter((r) => r.done).length;
  return (
    <div className="space-y-2.5 px-3 py-3" aria-live="polite" data-compare-progress="">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">Getting the facts <span className="tabular-nums text-muted-foreground">{done} of {shown.length}</span></span>
        <span className="type-meta tabular-nums text-muted-foreground">{formatDurationSeconds(s, { style: "clock" })}</span>
      </div>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.index} data-compare-row="">
            <div className="grid grid-cols-[1.25rem_minmax(0,8rem)_1fr_auto] items-center gap-2">
              <ItemLogo name={r.label} logoUrl={r.logoUrl} website={r.website} size={20} />
              <span className="type-secondary truncate text-foreground">{r.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className={cn("block h-full rounded-full transition-[width] duration-700", r.error ? "bg-destructive" : "bg-primary")}
                  style={{ width: `${(r.error ? 1 : STAGE_SHARE[r.stage]) * 100}%` }} />
              </span>
              <span className="type-meta min-w-20 text-right text-muted-foreground">
                {r.error ? "" : r.done ? "Done" : r.stageLabel || "Waiting"}
              </span>
            </div>
            {r.error ? <ErrorNotice size="inline" message={r.error} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The agent's `compare` result as a live card. Champion: the interactive answer cards in ChatGPT and
 * Perplexity (a found list you confirm, then a compact side-by-side that fills in, with the full page
 * one click away). The call itself only finds and quotes; THIS card's Confirm starts the paid run.
 */
export function CompareInline({ entry, expanded, onToggleExpanded }: ToolRendererProps) {
  const data = useMemo(() => parseCompare(entry), [entry]);
  const { organizationId } = useOrganizationRequired();
  const awaiting = data?.status === "awaiting_confirmation";
  const run = useCompareRun({
    runId: awaiting ? data?.runId ?? null : null,
    request: data?.request ?? null,
    organizationId: organizationId ?? null,
  });
  const runId = data?.runId ?? null;
  useEffect(() => {
    if (awaiting) setCompareRunPhase(runId, run.phase);
  }, [awaiting, runId, run.phase]);
  if (!data) return null;

  const photo = data.kind === "local_business";
  // The header names where the run stands: Ready to confirm -> Comparing -> Comparison / failed.
  const title = !awaiting ? "Compare" : run.phase === "done" ? "Comparison" : run.phase === "checking" ? "Compare" : compareStageLabel(run.phase);
  // every contender, matched or not yet (a pending one shows what was typed); a finished run names its items
  const names = run.phase === "done" && run.result
    ? run.result.items.map((i) => i.name).join(" vs ")
    : data.found.map((f) => f.name ?? f.typed).filter(Boolean).join(" vs ");
  const subtitle = names || null;

  let body: React.ReactNode;
  if (!awaiting) {
    body = (
      <div className="px-3 py-2.5">
        {data.found.length > 0 ? <ul className="mb-2 space-y-2">{data.found.map((f, i) => <FoundRow key={i} f={f} photo={photo} />)}</ul> : null}
        <p className="type-secondary text-muted-foreground" data-compare-note="">{data.message ?? ""}</p>
      </div>
    );
  } else if (run.phase === "done" && run.result && data.runId) {
    body = <CompactResult result={run.result} runId={data.runId} />;
  } else if (run.phase === "running" || run.phase === "starting") {
    body = <ProgressList rows={run.progress} found={data.found} startedAt={run.startedAt} />;
  } else if (run.phase === "failed") {
    body = <div className="px-3 py-3"><ErrorNotice size="inline" message={run.failure ?? "The comparison could not be run."} /></div>;
  } else {
    body = (
      <div className="space-y-3 px-3 py-3" data-compare-confirm="">
        {data.howFound ? (
          <p className="type-secondary text-muted-foreground" data-compare-how="">
            {data.howFound}{data.guessed ? " A best guess." : ""}
          </p>
        ) : null}
        {run.failure ? <ErrorNotice size="inline" message={run.failure} /> : null}
        <ChatLineup data={data} organizationId={organizationId ?? ""}
          starting={run.phase === "checking"} onStart={run.confirm} />
      </div>
    );
  }

  return (
    <EntityCard expanded={expanded} onToggleExpanded={onToggleExpanded} icon={Scale} accent="cyan" title={title} subtitle={subtitle}>
      {body}
    </EntityCard>
  );
}

/**
 * The confirm step IS the /compare lineup (one shared component): the rows the agent found (clean name +
 * city, each matched or offering its nearest real matches), a concept's found list to pick from, the price,
 * and Compare — which starts the run with exactly the cards the person confirmed.
 */
function ChatLineup({ data, organizationId, starting, onStart }: {
  data: ParsedCompare; organizationId: string; starting: boolean;
  onStart: (request: unknown) => void;
}) {
  const kinds = useComparisonKinds(organizationId || null);
  const kind = kinds.data?.find((k) => k.key === data.kind) ?? null;
  const [rows, setRows] = useState<CompareRow[]>(() => (data.rows.length ? data.rows : startRows()));
  const [near, setNear] = useState(() => data.discovered?.reading.area ?? "");
  const [found, setFound] = useState(data.discovered);

  if (!kind) {
    return kinds.isError
      ? <ErrorNotice size="inline" message="The comparison options could not be read. Try again." />
      : <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-label="Loading" />;
  }

  function start(matches: LookupMatch[]) {
    const discovered = data.discovered;
    const record = discovered
      ? discoveryRecord(discovered.reading.summary, discovered, discovered.items.map((i) => ({
        match: i.match, rank: i.rank, picked: inLineup(rows, i.match) })))
      : null;
    onStart({ kind: kind!.key, items: matches.map((m) => m.item), ...(record ? { discovery: record } : {}) });
  }

  return (
    <div className="space-y-3">
      {found ? (
        <PickList result={found} rows={rows}
          onAdd={(picks) => setRows((rs) => picks.reduce((acc, p) => placePick(acc, p.match, p.category), rs))}
          onClose={() => setFound(null)} />
      ) : null}
      <Lineup kind={kind} rows={rows} onRows={setRows} near={near} onNear={setNear} organizationId={organizationId}
        onCompare={start} dense starting={starting} />
    </div>
  );
}
