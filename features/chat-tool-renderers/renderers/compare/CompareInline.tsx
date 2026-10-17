"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, Star } from "lucide-react";
import type { ToolRendererProps } from "@ai-matrx/chat/tool-call-visualization/types";
import { EntityCard } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared-entity/EntityCard";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { formatPoints } from "@ai-matrx/kit/format";

import { cn } from "@/lib/utils";
import { useSeesDollars } from "@/components/cost/useCostDisplay";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { ItemLogo } from "@/features/comparison/components/ItemLogo";
import type { ItemProgress, ItemStage } from "@/features/comparison/contract";

import { CompactResult } from "./CompactResult";
import { parseCompare, type FoundThing } from "./parseCompare";
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
        <span className="type-meta tabular-nums text-muted-foreground">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>
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
  const seesDollars = useSeesDollars();
  const awaiting = data?.status === "awaiting_confirmation";
  const run = useCompareRun({
    runId: awaiting ? data?.runId ?? null : null,
    request: data?.request ?? null,
    organizationId: organizationId ?? null,
  });
  if (!data) return null;

  const photo = data.kind === "local_business";
  const title = run.phase === "done" ? "Comparison" : "Compare";
  const names = data.found.filter((f) => f.name).map((f) => f.name).join(" vs ");
  const subtitle = names || data.found.map((f) => f.typed).join(" vs ") || null;

  let body: React.ReactNode;
  if (!awaiting) {
    body = (
      <div className="px-3 py-2.5">
        {data.found.length > 0 ? <ul className="mb-2 space-y-2">{data.found.map((f, i) => <FoundRow key={i} f={f} photo={photo} />)}</ul> : null}
        <p className="type-secondary text-muted-foreground" data-compare-note="">{data.message ?? ""}</p>
      </div>
    );
  } else if (run.phase === "done" && run.result && data.runId) {
    body = <CompactResult result={run.result} runId={data.runId} seesDollars={seesDollars} />;
  } else if (run.phase === "running" || run.phase === "starting") {
    body = <ProgressList rows={run.progress} found={data.found} startedAt={run.startedAt} />;
  } else if (run.phase === "failed") {
    body = <div className="px-3 py-3"><ErrorNotice size="inline" message={run.failure ?? "The comparison could not be run."} /></div>;
  } else {
    body = (
      <div className="space-y-3 px-3 py-3" data-compare-confirm="">
        <ul className="space-y-2.5">{data.found.map((f, i) => <FoundRow key={i} f={f} photo={photo} />)}</ul>
        {run.failure ? <ErrorNotice size="inline" message={run.failure} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
          <span className="type-meta text-muted-foreground">
            {data.quote ? (
              <>
                <span className="tabular-nums text-foreground">{formatPoints(data.quote.total_points)}</span>
                {seesDollars && data.quote.total_usd_display ? <span className="tabular-nums"> · {data.quote.total_usd_display}</span> : null}
                {" · about a minute or two"}
              </>
            ) : null}
          </span>
          <Button variant="primary" disabled={run.phase === "checking" || !organizationId} onClick={run.confirm} data-compare-confirm-button="">
            Compare {data.request && typeof data.request === "object" && Array.isArray((data.request as { items?: unknown[] }).items) ? (data.request as { items: unknown[] }).items.length : ""}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EntityCard expanded={expanded} onToggleExpanded={onToggleExpanded} icon={Scale} accent="cyan" title={title} subtitle={subtitle}>
      {body}
    </EntityCard>
  );
}
