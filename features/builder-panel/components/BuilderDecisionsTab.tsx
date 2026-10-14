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
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { cn } from "@/lib/utils";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { costByPath, thresholdText, valueText, type RoundDecision, type PathSignal } from "../decisions";
import { BuilderJson } from "./BuilderJson";

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

export function BuilderDecisionsTab({
  rounds,
  onOpenStep,
}: {
  rounds: RoundDecision[];
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
        <Select aria-label="Round" value={current.runId} onValueChange={setPicked} options={options} />
        <span className="truncate font-mono text-[11px] text-muted-foreground">{current.runId}</span>
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
            {d.flag ? <p className="text-amber-700 dark:text-amber-400">{d.flag}</p> : null}
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
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
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
