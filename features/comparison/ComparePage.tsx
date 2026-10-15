"use client";

/**
 * /compare — the deterministic comparison engine's home (aidream `services/comparison`). A person
 * gives a LIST of same-type things (branch B), we fetch the real facts for each through the data
 * engine (metered, points quoted up front), and show a clean, ranked side-by-side: ranked cards and
 * a field-by-field table, the leader of each field marked, every raw table one click away. No AI in
 * this layer. Branches A (we find the list) and C (nationwide service) are the documented next steps
 * (`common-docs/systems/web/web-search/comparison-engine/STATE.md`).
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Plus, RotateCcw, Table2, Trophy, X } from "lucide-react";
import { Badge, Button, EmptyState, Field, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorNotice, ReadFailure } from "@ai-matrx/design-system";
import { formatPoints } from "@ai-matrx/kit/format";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useCostDisplay, useSeesDollars } from "@/components/cost/useCostDisplay";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { cn } from "@/lib/utils";

import { useComparisonKinds, useComparisonOrganizationId } from "./hooks";
import { quoteComparison, runComparison } from "./server";
import {
  ComparisonRefusal,
  type CompareField,
  type ComparedItem,
  type ComparisonKindInfo,
  type ComparisonProgress,
  type ComparisonResult,
} from "./contract";

type Row = { id: string; url: string };

const newRow = (): Row => ({ id: Math.random().toString(36).slice(2), url: "" });

export function ComparePage() {
  const organizationId = useComparisonOrganizationId();
  const kinds = useComparisonKinds(organizationId);
  return (
    <>
      <RecordPageHeader backHref="/data" record={{ name: "Compare" }} />
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto" data-matrx-page-scroll="">
          {!organizationId || kinds.isLoading ? (
            <div className="mx-auto max-w-5xl p-6">
              <RegionSkeleton shape="cards" count={4} aria-label="Loading" />
            </div>
          ) : kinds.error || !kinds.data ? (
            <div className="mx-auto max-w-5xl p-6">
              <ReadFailure error={kinds.error} what="the comparison kinds" onRetry={() => void kinds.refetch()} />
            </div>
          ) : (
            <CompareBody kinds={kinds.data} organizationId={organizationId} />
          )}
        </div>
      </div>
    </>
  );
}

function CompareBody({ kinds, organizationId }: { kinds: ComparisonKindInfo[]; organizationId: string }) {
  const live = kinds.filter((k) => k.status === "live");
  const [kindKey, setKindKey] = useState<string>(live[0]?.key ?? "");
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ComparisonProgress | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const kind = kinds.find((k) => k.key === kindKey) ?? null;
  const filled = rows.map((r) => r.url.trim()).filter(Boolean);
  const canRun = Boolean(kind && kind.status === "live" && filled.length >= 2 && !running);

  async function start() {
    if (!kind || !canRun) return;
    setRunning(true);
    setRefusal(null);
    setResult(null);
    setProgress(null);
    try {
      const out = await runComparison(
        kind.key,
        rows.filter((r) => r.url.trim()).map((r) => ({ url: r.url.trim() })),
        { organizationId, onProgress: setProgress },
      );
      setResult(out);
    } catch (err) {
      setRefusal(err instanceof ComparisonRefusal ? err.userMessage : "The comparison could not be run.");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  function reset() {
    setResult(null);
    setRefusal(null);
    setRows([newRow(), newRow(), newRow()]);
  }

  if (result) {
    return <ResultView result={result} kind={kind} onReset={reset} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compare</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Line up two or more and see the real numbers side by side, ranked.
        </p>
      </header>

      <section className="mb-8">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">What to compare</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kinds.map((k) => (
            <KindTile key={k.key} kind={k} selected={k.key === kindKey}
              onSelect={() => k.status === "live" && setKindKey(k.key)} />
          ))}
        </div>
      </section>

      {kind && kind.status === "live" ? (
        <section className="space-y-4">
          <div>
            <div className="text-sm font-medium text-foreground">{kind.input_label}</div>
            {kind.input_hint ? <div className="text-xs text-muted-foreground">{kind.input_hint}</div> : null}
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={row.id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                {/* ui-exception: a pasted link is a raw value, not prose */}
                <Field
                  value={row.url}
                  placeholder={kind.example ?? "Paste a link"}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, url: e.target.value } : r)))}
                  className="flex-1"
                  aria-label={`Item ${i + 1}`}
                />
                <Button variant="quiet" aria-label="Remove" disabled={rows.length <= 2}
                  onClick={() => setRows((rs) => (rs.length > 2 ? rs.filter((r) => r.id !== row.id) : rs))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="quiet" disabled={rows.length >= 20} onClick={() => setRows((rs) => [...rs, newRow()])}>
              <Plus className="mr-1 h-4 w-4" /> Add another
            </Button>
          </div>

          <QuoteLine kind={kind} count={filled.length} organizationId={organizationId} />

          {refusal ? <ErrorNotice message={refusal} /> : null}

          {running ? (
            <RunProgress progress={progress} count={filled.length} />
          ) : (
            <div className="flex items-center gap-3">
              <Button onClick={start} disabled={!canRun}>Compare</Button>
              {filled.length < 2 ? (
                <span className="text-xs text-muted-foreground">Add at least two.</span>
              ) : null}
            </div>
          )}
        </section>
      ) : kind ? (
        <EmptyState title={`${kind.label} is coming soon`} description={kind.discovery_note || kind.description} />
      ) : null}
    </div>
  );
}

function KindTile({ kind, selected, onSelect }: { kind: ComparisonKindInfo; selected: boolean; onSelect: () => void }) {
  const coming = kind.status === "coming";
  return (
    <button
      type="button"
      onClick={onSelect}
      data-clickable={!coming ? "" : undefined}
      aria-pressed={selected}
      disabled={coming}
      className={cn(
        "flex h-full flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent",
        coming && "opacity-60",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-foreground">{kind.label}</span>
        {coming ? <Badge variant="outline">Soon</Badge> : null}
      </div>
      <span className="line-clamp-2 text-xs text-muted-foreground">{kind.description}</span>
    </button>
  );
}

function QuoteLine({ kind, count, organizationId }: { kind: ComparisonKindInfo; count: number; organizationId: string }) {
  const seesDollars = useSeesDollars();
  const quote = useQuery({
    queryKey: ["comparison", "quote", kind.key, count, organizationId],
    queryFn: ({ signal }) =>
      quoteComparison(kind.key, Array.from({ length: count }, () => ({ url: "x" })), { organizationId, signal }),
    enabled: count >= 2,
    staleTime: 60 * 1000,
  });
  if (count < 2) return null;
  if (!quote.data) return <div className="h-5" />;
  const q = quote.data;
  const points = formatPoints(q.total_points);
  const usd = seesDollars && q.total_usd != null ? ` · ${formatAdminUsd(q.total_usd)}` : "";
  return (
    <div className="text-sm text-muted-foreground">
      About <span className="font-medium text-foreground">{points}</span>{usd} to compare {count}
      <span className="text-muted-foreground"> · up to {q.records_per_item} record(s) each</span>
    </div>
  );
}

function RunProgress({ progress, count }: { progress: ComparisonProgress | null; count: number }) {
  const done = progress ? progress.itemIndex : 0;
  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{progress?.itemLabel ? `Reading ${progress.itemLabel}` : "Getting the facts"}</span>
        <span className="tabular-nums text-muted-foreground">{Math.min(done + 1, count)} / {count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round((Math.min(done + 1, count) / Math.max(count, 1)) * 100)}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">{progress?.label ?? "Working"}</div>
    </div>
  );
}

// ── results ──────────────────────────────────────────────────────────────

function ResultView({ result, kind, onReset }: { result: ComparisonResult; kind: ComparisonKindInfo | null; onReset: () => void }) {
  const seesDollars = useSeesDollars();
  const good = result.items.filter((i) => !i.error);
  const primary = result.fields.find((f) => f.is_primary) ?? null;
  const winner = good.find((i) => i.rank === 1) ?? null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <RecordHeaderRow result={result} onReset={onReset} />

      {winner && primary ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm text-foreground">
            <span className="font-semibold">{winner.name}</span> leads on {primary.label.toLowerCase()}
            <span className="text-muted-foreground"> — {winner.values[primary.key]?.display ?? "—"}</span>
          </div>
        </div>
      ) : null}

      {/* Ranked cards (the visual view) */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item) => (
          <RankCard key={item.item_id} item={item} primary={primary} seesDollars={seesDollars} />
        ))}
      </div>

      {/* Field-by-field table */}
      <ComparisonTable result={result} />

      {result.notices.length ? (
        <div className="mt-6 space-y-1">
          {result.notices.map((n, i) => (
            <div key={i} className="text-xs text-muted-foreground">{n}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecordHeaderRow({ result, onReset }: { result: ComparisonResult; onReset: () => void }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{result.kind_label}</h1>
        <p className="text-sm text-muted-foreground">
          {result.items.length} compared · {result.total_records_billed} record(s) read
        </p>
      </div>
      <Button variant="outline" onClick={onReset}>
        <RotateCcw className="mr-1 h-4 w-4" /> New comparison
      </Button>
    </header>
  );
}

function RankCard({ item, primary, seesDollars }: { item: ComparedItem; primary: CompareField | null; seesDollars: boolean }) {
  if (item.error) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 text-sm font-medium text-foreground">{item.name}</div>
        <ErrorNotice message={item.error} />
      </div>
    );
  }
  const primaryVal = primary ? item.values[primary.key] : undefined;
  const lead = item.rank === 1;
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border bg-card p-4", lead ? "border-primary/50" : "border-border")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
            lead ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {item.rank}
          </span>
          {lead ? <Crown className="h-4 w-4 text-primary" /> : null}
        </div>
        {primaryVal ? <span className="text-lg font-semibold tabular-nums text-foreground">{primaryVal.display}</span> : null}
      </div>
      <div className="truncate text-sm font-medium text-foreground" title={item.name}>{item.name}</div>
      <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <span>{formatPoints(item.points)}{seesDollars ? ` · ${formatAdminUsd(item.cost_usd)}` : ""}</span>
        {item.table_id ? (
          <a href={`/data/${item.table_id}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline">
            <Table2 className="h-3.5 w-3.5" /> Facts
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ComparisonTable({ result }: { result: ComparisonResult }) {
  const items = result.items;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-medium text-muted-foreground">Field</th>
            {items.map((it) => (
              <th key={it.item_id} className="min-w-[9rem] px-3 py-2 text-left font-medium text-foreground">
                <span className="mr-1 text-xs tabular-nums text-muted-foreground">#{it.rank}</span>
                <span title={it.name} className="line-clamp-1">{it.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.fields.map((f) => (
            <tr key={f.key} className={cn("border-b border-border last:border-0", f.is_primary && "bg-primary/[0.03]")}>
              <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal text-muted-foreground" title={f.help}>
                {f.label}
              </th>
              {items.map((it) => {
                const v = it.error ? undefined : it.values[f.key];
                return (
                  <td key={it.item_id} className="px-3 py-2">
                    {v ? (
                      <span className={cn("tabular-nums", v.is_best ? "font-semibold text-foreground" : "text-foreground")}>
                        {v.display}
                        {v.is_best ? <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide text-primary">Best</span> : null}
                      </span>
                    ) : (
                      <span className="text-disabled-foreground">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
