"use client";

/**
 * Decisions tab — for each round (workflow run): the path it chose, every signal against its threshold, the
 * entry checks in the order they were tried, any escalation, the steps it skipped and why, and its hard cost;
 * then the cost per path across rounds. Reads the stored `path_decision` step output (aidream
 * `brand.identify.path_decision`). Design: common-docs/.../smart-add-brand/PATHS.md.
 */

import { useState } from "react";
import { ArrowRight, Check, CircleDot, X } from "lucide-react";
import { Badge, Button, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { cn } from "@/lib/utils";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { costByPath, thresholdText, valueText, type RoundDecision, type PathSignal } from "../decisions";
import { BuilderJson } from "./BuilderJson";
import type { NameSearchRow } from "@/features/marketing/smart-add/nameStrength";

function pathName(key: string): string {
  return key.replace(/_/g, " ");
}

const SIGNAL_COLUMNS: MatrxColumnDef<PathSignal>[] = [
  { id: "label", header: "Signal", accessorKey: "label", filter: "text",
    cell: (signal) => <span title={signal.source}>{signal.label}</span> },
  { id: "value", header: "Value", accessorFn: (signal) => valueText(signal.value), filter: "text",
    cell: (signal) => <span className="font-mono tabular-nums" title={valueText(signal.value)}>{valueText(signal.value)}</span> },
  { id: "threshold", header: "Threshold", accessorFn: thresholdText, filter: "text" },
  { id: "fired", header: "Fired", accessorFn: (signal) => signal.op ? (signal.fired ? "yes" : "no") : "", filter: "select",
    cell: (signal) => signal.op ? (signal.fired
      ? <CircleDot className="h-3.5 w-3.5 text-primary" aria-label="fired" />
      : <span className="text-muted-foreground">no</span>) : null },
  { id: "source", header: "Source", accessorKey: "source", filter: "text", hidden: true },
];

type PathCost = ReturnType<typeof costByPath>[number];

/** One find-you decision published by a page (Smart Add person harder: `decisions.find_you`). */
interface FindRow {
  at: number;
  kind: string;
  text: string;
  bucket?: string | null;
  url?: string | null;
  points?: number | null;
}

/** The hard / close-to-impossible sweep (aidream person_hard.py): every call, every row's tier, every filter. */
interface SweepCallRow {
  engine: string;
  query: string;
  page: number;
  results: number;
  ms: number;
  points: number | null;
  usd: number | null;
  error: string | null;
}
interface SweepRowFeed {
  url: string;
  title: string | null;
  tier: string;
  tier_reason: string;
  score: number;
  engines: string;
  best_rank: number;
  answer: string | null;
  raw: Record<string, unknown>;
}
export interface SweepFeed {
  path: string;
  calls: SweepCallRow[];
  rows: SweepRowFeed[];
  filters: { key: string; label: string; removed: number; urls: string[] }[];
  points: number | null;
  ms: number;
}

export interface FindYouFeed {
  log: FindRow[];
  anchorBucket: string | null;
  anchorUrl: string | null;
  history: unknown[];
  sweep?: SweepFeed | null;
  focus?: Record<string, { status: string; found: boolean }> | null;
}

const SWEEP_CALL_COLUMNS: MatrxColumnDef<SweepCallRow & { id: string }>[] = [
  { id: "engine", header: "Engine", accessorKey: "engine", filter: "select" },
  { id: "query", header: "Query", accessorKey: "query", filter: "text" },
  { id: "page", header: "Page", accessorKey: "page" },
  { id: "results", header: "Rows", accessorKey: "results" },
  { id: "ms", header: "Time", accessorFn: (r) => formatDurationMs(r.ms, { style: "compact" }) },
  { id: "points", header: "Points", accessorFn: (r) => r.points ?? "?" },
  { id: "usd", header: "$", accessorFn: (r) => formatAdminUsd(r.usd) },
  { id: "error", header: "Error", accessorFn: (r) => r.error ?? "", filter: "text" },
];

const SWEEP_ROW_COLUMNS: MatrxColumnDef<SweepRowFeed & { id: string }>[] = [
  { id: "tier", header: "Tier", accessorKey: "tier", filter: "select" },
  { id: "title", header: "Result", accessorFn: (r) => r.title ?? r.url, filter: "text",
    cell: (r) => <span title={r.url}>{r.title ?? r.url}</span> },
  { id: "reason", header: "Why this tier", accessorKey: "tier_reason", filter: "text" },
  { id: "score", header: "Match", accessorKey: "score" },
  { id: "engines", header: "Found by", accessorKey: "engines", filter: "select" },
  { id: "rank", header: "Best rank", accessorKey: "best_rank" },
  { id: "answer", header: "Answer", accessorFn: (r) => r.answer ?? "", filter: "select" },
  { id: "url", header: "URL", accessorKey: "url", filter: "text", hidden: true },
];

function SweepSection({ sweep, focus }: { sweep: SweepFeed; focus?: FindYouFeed["focus"] }) {
  const removed = sweep.filters.filter((f) => f.removed);
  return (
    <section data-testid="builder-find-you-sweep">
      <h3 className="mb-1 flex items-center gap-2 font-medium">
        Sweep · {sweep.path}
        <span className="font-normal text-muted-foreground">
          {sweep.calls.length} calls · {sweep.rows.length} rows · {sweep.points ?? "?"} points · {formatDurationMs(sweep.ms, { style: "compact" })}
        </span>
      </h3>
      <MatrxDataTable<SweepCallRow & { id: string }>
        tableId="builder/decision-sweep-calls"
        data={sweep.calls.map((r, i) => ({ ...r, id: String(i) }))}
        columns={SWEEP_CALL_COLUMNS}
        getRowId={(r) => r.id}
        pageSize={0}
        density="condensed"
        copy={{ label: "Sweep call", listLabel: "Sweep calls", location: "Builder · Decisions", rowKind: "sweep-call", listKind: "sweep-calls",
          humanRow: (r) => `${r.engine} p${r.page} ${r.query}: ${r.results} rows, ${r.ms} ms, ${r.points ?? "?"} pts` }}
      />
      <p className="my-1 text-muted-foreground">
        Filters: {removed.length ? removed.map((f) => `${f.label} ${f.removed}`).join(" · ") : "nothing removed"}
      </p>
      <MatrxDataTable<SweepRowFeed & { id: string }>
        tableId="builder/decision-sweep-rows"
        data={sweep.rows.map((r, i) => ({ ...r, id: String(i) }))}
        columns={SWEEP_ROW_COLUMNS}
        getRowId={(r) => r.id}
        pageSize={0}
        density="condensed"
        toolbar={{ search: true, searchPlaceholder: "Search rows" }}
        copy={{ label: "Sweep row", listLabel: "Sweep rows", location: "Builder · Decisions", rowKind: "sweep-row", listKind: "sweep-rows",
          humanRow: (r) => `${r.tier} · ${r.title ?? ""}\n${r.url}\n${r.tier_reason}` }}
      />
      {focus && Object.keys(focus).length ? (
        <p className="mt-1 text-muted-foreground">
          Focused sessions: {Object.entries(focus).map(([k, v]) => `${k} ${v.status}${v.found ? " · found" : ""}`).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

const FIND_COLUMNS: MatrxColumnDef<FindRow & { id: string }>[] = [
  { id: "at", header: "Time", accessorFn: (r) => new Date(r.at).toLocaleTimeString(), filter: "text" },
  { id: "kind", header: "Kind", accessorKey: "kind", filter: "select" },
  { id: "text", header: "Decision", accessorKey: "text", filter: "text",
    cell: (r) => <span title={r.url ?? r.text}>{r.text}</span> },
  { id: "bucket", header: "Bucket", accessorFn: (r) => r.bucket ?? "", filter: "select" },
  { id: "points", header: "Points", accessorFn: (r) => r.points ?? null, filter: "number" },
];

/** Smart Add enrich (ENRICH.md): the seeded known-facts set and the diff against the brand. */
export interface EnrichDecisionsFeed {
  brandId: string;
  known: { id: string; group: string; label: string; value: string; seeded: boolean }[];
  diff: { id: string; kind: string; label: string; current: string | null; next: string | null; defaultChoice: string }[];
}

function EnrichSection({ enrich }: { enrich: EnrichDecisionsFeed }) {
  const seeded = enrich.known.filter((k) => k.seeded).length;
  const changes = enrich.diff.filter((d) => d.kind !== "unchanged");
  return (
    <section data-testid="builder-enrich">
      <h3 className="mb-1 flex items-center gap-2 font-medium">
        Enrich
        <Badge tone="info">{seeded}/{enrich.known.length} known facts seeded</Badge>
        <span className="font-normal text-muted-foreground">{changes.length} changes · {enrich.diff.length - changes.length} unchanged</span>
      </h3>
      <ul className="space-y-0.5">
        {enrich.known.map((k) => (
          <li key={k.id} className="flex gap-1.5">
            <span className={k.seeded ? "" : "text-muted-foreground line-through"}>{k.label}</span>
            <span className="truncate text-muted-foreground">· {k.value}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-2 space-y-0.5">
        {changes.map((d) => (
          <li key={d.id} className="flex gap-1.5">
            <Badge tone={d.kind === "conflict" ? "warning" : d.kind === "replace" ? "primary" : "success"}>{d.kind}</Badge>
            <span>{d.label}</span>
            <span className="truncate text-muted-foreground">
              · {d.current ?? ""}{d.current && d.next ? " → " : ""}{d.next ?? ""} · default {d.defaultChoice}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const STRENGTH_TONE = { strong: "success", usable_with_anchor: "warning", weak: "destructive" } as const;
const STRENGTH_LABEL = { strong: "Strong", usable_with_anchor: "Needs an anchor", weak: "Weak" } as const;
const KIND_LABEL = { full_name: "full name", brand_name: "brand name", display_name: "display name" } as const;

/** Name strength (Report 2026-10-15): per name search step, the verdict and every keyword it sent. */
function NameSearchSection({ rows }: { rows: NameSearchRow[] }) {
  const v = rows[rows.length - 1].strength;
  return (
    <section data-testid="builder-name-strength">
      <h3 className="mb-1 flex flex-wrap items-center gap-2 font-medium">
        Name strength
        <Badge tone={STRENGTH_TONE[v.strength]}>{STRENGTH_LABEL[v.strength]}</Badge>
        <span className="font-normal text-muted-foreground">
          &quot;{v.cleaned || v.name}&quot; · {KIND_LABEL[v.kind]} · {v.reasons.join(" · ")}
        </span>
      </h3>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.step} className="flex gap-1.5">
            <span className="w-36 shrink-0">{r.step}</span>
            <span className="min-w-0 truncate font-mono" title={r.queries.join("\n")}>
              {r.queries.length ? r.queries.join(" · ") : "not searched"}
            </span>
            <span className="ml-auto shrink-0 text-muted-foreground">{r.strength.why}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BuilderDecisionsTab({
  rounds,
  findYou = null,
  enrich = null,
  onOpenStep,
}: {
  rounds: RoundDecision[];
  /** Smart Add enrich: the seeded known facts and the diff, when the page published them. */
  enrich?: EnrichDecisionsFeed | null;
  /** A page's find-you log (Smart Add person harder), when it published one. */
  findYou?: FindYouFeed | null;
  onOpenStep: (runId: string, nodeId: string | null) => void;
}) {
  const { format } = useCostDisplay();
  const [picked, setPicked] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  if (!rounds.length) return <p className="p-3 text-xs text-muted-foreground">No workflow run on this page yet</p>;
  const current = rounds.find((r) => r.runId === picked) ?? rounds[rounds.length - 1];
  const d = current.decision;
  const options: SelectOption<string>[] = rounds.map((r, i) => ({
    value: r.runId,
    label: `${i + 1}. ${r.decision?.label ?? "No decision"} · ${r.label}`,
  }));
  const chosen = d?.checks.find((c) => c.passed)?.path ?? null;
  const totals = costByPath(rounds);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <Select aria-label="Round" className="max-w-full" value={current.runId} onValueChange={setPicked} options={options} />
        </div>
        <div className="min-w-0 flex-1">
          <Button variant="quiet" width="xl" onClick={() => onOpenStep(current.runId, null)}>{current.runId}</Button>
        </div>
        <Button variant="quiet" className="ml-auto" onClick={() => onOpenStep(current.runId, "path_decision")}>
          Open step
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3 text-xs">
        {d ? (
          <>
            <section className="flex flex-wrap items-center gap-2">
              <Badge tone={d.built ? "success" : "warning"}>{d.label}</Badge>
              {!d.built ? (
                <span className="text-muted-foreground">runs as {pathName(d.runsAs)}</span>
              ) : null}
              <span className="text-muted-foreground">
                {d.subject} · {d.roundKind ?? "round"} · thresholds {d.thresholdsSource}
              </span>
              <span className="ml-auto tabular-nums text-muted-foreground">{format(current.costUsd)}</span>
            </section>
            {d.flag ? <p className="text-warning">{d.flag}</p> : null}
            {d.escalation ? (
              <p className="flex items-center gap-1.5">
                <span className="font-medium">Escalated</span>
                {pathName(d.escalation.from)} <ArrowRight className="h-3 w-3" /> {pathName(d.escalation.to)}
                <span className="text-muted-foreground">· {d.escalation.reason}</span>
              </p>
            ) : null}
            {!d.measured ? <p className="text-muted-foreground">{d.why}</p> : null}
            {d.subjectHint ? (
              <p className="text-muted-foreground">
                Homepage reads as a {String(d.subjectHint.verdict)}: {valueText(d.subjectHint.signals)}
              </p>
            ) : null}

            {d.signals.length ? (
              <section>
                <h3 className="mb-1 font-medium">Signals</h3>
                <MatrxDataTable<PathSignal>
                  tableId="builder/decision-signals"
                  data={d.signals}
                  columns={SIGNAL_COLUMNS}
                  getRowId={(signal) => signal.key}
                  pageSize={0}
                  density="condensed"
                  toolbar={{ search: true, searchPlaceholder: "Search signals" }}
                  copy={{
                    label: "Signal", listLabel: "Signals", location: "Builder · Decisions",
                    rowKind: "decision-signal", listKind: "decision-signals",
                    humanRow: (signal) => `${signal.label}: ${valueText(signal.value)}\nThreshold: ${thresholdText(signal)}\nFired: ${signal.op ? (signal.fired ? "yes" : "no") : ""}\nSource: ${signal.source}`,
                  }}
                />
              </section>
            ) : null}

            {d.checks.length ? (
              <section>
                <h3 className="mb-1 font-medium">Entry checks, in order</h3>
                <ol className="space-y-0.5">
                  {d.checks.map((c) => (
                    <li key={c.path} className={cn("flex items-center gap-1.5", c.path === chosen && "font-medium")}>
                      {c.passed ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span>{pathName(c.path)}</span>
                      <span className="truncate text-muted-foreground">· {c.because.join(", ")}</span>
                      {c.path === chosen ? <Badge tone="primary">chosen</Badge> : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">{current.missing}</p>
        )}

        {current.nameSearches.length ? <NameSearchSection rows={current.nameSearches} /> : null}

        {enrich ? <EnrichSection enrich={enrich} /> : null}

        {findYou ? (
          <section>
            <h3 className="mb-1 flex items-center gap-2 font-medium">
              Find you
              <Badge tone={findYou.anchorBucket ? "success" : "warning"}>
                {findYou.anchorBucket ? `anchor from ${findYou.anchorBucket}` : "no firm anchor yet"}
              </Badge>
              <span className="font-normal text-muted-foreground">path history {findYou.history.length}</span>
            </h3>
            <MatrxDataTable<FindRow & { id: string }>
              tableId="builder/decision-find-you"
              data={findYou.log.map((r, i) => ({ ...r, id: String(i) }))}
              columns={FIND_COLUMNS}
              getRowId={(r) => r.id}
              pageSize={0}
              density="condensed"
              toolbar={{ search: true, searchPlaceholder: "Search decisions" }}
              copy={{
                label: "Find-you decision", listLabel: "Find-you decisions", location: "Builder · Decisions",
                rowKind: "find-you-decision", listKind: "find-you-decisions",
                humanRow: (r) => `${r.kind}: ${r.text}${r.url ? `\n${r.url}` : ""}`,
              }}
            />
          </section>
        ) : null}
        {findYou?.sweep ? <SweepSection sweep={findYou.sweep} focus={findYou.focus} /> : null}

        <section>
          <h3 className="mb-1 font-medium">Skipped steps</h3>
          {current.skipped.length ? (
            <ul className="space-y-0.5">
              {current.skipped.map((s) => (
                <li key={s.title} className="flex gap-1.5">
                  <span>{s.title}</span>
                  <span className="truncate text-muted-foreground">· {s.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">None</p>
          )}
        </section>

        <section>
          <h3 className="mb-1 font-medium">Cost by path</h3>
          <MatrxDataTable<PathCost>
            tableId="builder/decision-costs"
            data={totals}
            columns={[
              { id: "label", header: "Path", accessorKey: "label", filter: "text" },
              { id: "rounds", header: "Rounds", accessorKey: "rounds", filter: "number" },
              { id: "costUsd", header: "Cost", accessorKey: "costUsd", filter: "number",
                copyValue: (row) => format(row.costUsd), cell: (row) => format(row.costUsd) },
            ]}
            getRowId={(row) => row.path}
            pageSize={0}
            density="condensed"
            toolbar={{ search: true, searchPlaceholder: "Search paths" }}
            copy={{
              label: "Path cost", listLabel: "Cost by path", location: "Builder · Decisions",
              rowKind: "decision-path-cost", listKind: "decision-path-costs",
              humanRow: (row) => `${row.label}\nRounds: ${row.rounds}\nCost: ${format(row.costUsd)}`,
            }}
          />
        </section>

        {d ? (
          <section>
            <Button variant="quiet" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "Hide record" : "Show record"}
            </Button>
            {showRaw ? <BuilderJson data={d.raw} label="path_decision" location="Decisions" className="mt-2 h-80" /> : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
