"use client";

/**
 * Workflow tab — every run this page published, as its node graph (in run order) with each
 * node's state and output, read live from the workflow runtime (`workflowRuns` slice; the
 * shown run is adopted through `useWorkflowRun`, refcounted, so it streams here too). Below:
 * the PROPOSED workflow shapes for this surface (`mandate.proposal`, shape_type workflow).
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Eye } from "lucide-react";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { Badge, Button, RegionSkeleton, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import {
  selectNodeAggregate,
  selectRunCostTotal,
  selectRunInput,
  selectRunNodeOrder,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { useWatchAiRun } from "@/features/overlays/openers/aiWatchWindow";
import type { BuilderEntry } from "../types";
import type { MandateProposal } from "../data";
import { BuilderValue } from "./BuilderValue";
import { ProposalCard } from "./ProposalCard";

type Tone = "neutral" | "success" | "warning" | "destructive" | "info";
const PHASE_TONE: Record<string, Tone> = {
  settled: "success",
  completed: "success",
  running: "info",
  retrying: "warning",
  failed: "destructive",
  errored: "destructive",
  skipped: "neutral",
  idle: "neutral",
};

function NodeRow({ runId, nodeId }: { runId: string; nodeId: string }) {
  const agg = useAppSelector(selectNodeAggregate(runId, nodeId));
  const [open, setOpen] = useState(false);
  const { format } = useCostDisplay();
  const last = agg.invocations[agg.invocations.length - 1] ?? null;
  const cost = typeof last?.output?.cost_usd === "number" ? last.output.cost_usd : null;
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        data-clickable
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/50"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate text-xs font-medium">{nodeId}</span>
        <Badge tone={PHASE_TONE[agg.phase] ?? "neutral"}>{agg.phase}</Badge>
        {agg.expectedCount > 1 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {agg.settledCount}/{agg.expectedCount}
          </span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          {last?.durationMs != null ? <span>{formatDurationMs(last.durationMs)}</span> : null}
          {cost != null ? <span>{format(cost)}</span> : null}
        </span>
      </button>
      {last?.progress?.message ? <p className="px-8 pb-1 text-[11px] text-muted-foreground">{last.progress.message}</p> : null}
      {last?.error?.message ? <p className="px-8 pb-1 text-[11px] text-destructive">{last.error.message}</p> : null}
      {open ? (
        <div className="px-8 pb-2">
          <BuilderValue value={last?.output ?? null} kind={last?.outputKind ?? null} raw={false} />
        </div>
      ) : null}
    </li>
  );
}

function RunGraph({ runId, label }: { runId: string; label: string }) {
  useWorkflowRun(runId);
  const status = useAppSelector(selectRunStatus(runId));
  const order = useAppSelector(selectRunNodeOrder(runId));
  const input = useAppSelector(selectRunInput(runId));
  const cost = useAppSelector(selectRunCostTotal(runId));
  const watch = useWatchAiRun();
  const { format } = useCostDisplay();
  const [showInput, setShowInput] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-sm font-semibold">{label}</span>
        <Badge tone={PHASE_TONE[status ?? "idle"] ?? "info"}>{status ?? "waiting"}</Badge>
        {typeof cost === "number" && cost > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">{format(cost)}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="quiet" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => watch({ workflowRunId: runId, label })}>
            Watch AI
          </Button>
          <Button variant="quiet" asChild icon={<ExternalLink className="h-3.5 w-3.5" />}>
            <a href={runHref(runId)} target="_blank" rel="noopener noreferrer">
              Open run
            </a>
          </Button>
        </div>
      </div>
      <button
        type="button"
        data-clickable
        onClick={() => setShowInput((s) => !s)}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        {showInput ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Run inputs
      </button>
      {showInput ? <BuilderValue value={input} raw={false} /> : null}
      {order.length ? (
        <ol className="rounded-md border border-border">
          {order.map((nodeId) => (
            <NodeRow key={nodeId} runId={runId} nodeId={nodeId} />
          ))}
        </ol>
      ) : (
        <p className="text-xs text-muted-foreground">No steps reported yet</p>
      )}
    </section>
  );
}

export function BuilderWorkflowTab({
  runs,
  proposals,
  proposalsError,
}: {
  runs: { entry: BuilderEntry; runId: string; label: string }[];
  proposals: MandateProposal[] | null;
  proposalsError: string | null;
}) {
  // Newest run first by default.
  const [picked, setPicked] = useState<string | null>(null);
  const ordered = [...runs].sort((a, b) => b.entry.at - a.entry.at);
  const current = ordered.find((r) => r.runId === picked) ?? ordered[0] ?? null;
  const options: SelectOption<string>[] = ordered.map((r) => ({ value: r.runId, label: r.label }));
  const shapes = (proposals ?? []).filter((p) => p.shapeType === "workflow");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-3">
      {current ? (
        <>
          {ordered.length > 1 ? (
            <Select aria-label="Run" value={current.runId} onValueChange={setPicked} options={options} />
          ) : null}
          <RunGraph key={current.runId} runId={current.runId} label={current.label} />
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No workflow run on this page yet</p>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed</h3>
        {proposalsError ? <p className="text-xs text-destructive">{proposalsError}</p> : null}
        {proposals === null && !proposalsError ? <RegionSkeleton shape="cards" count={1} /> : null}
        {proposals && !shapes.length ? <p className="text-xs text-muted-foreground">No proposed workflow</p> : null}
        {shapes.map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      </section>
    </div>
  );
}
