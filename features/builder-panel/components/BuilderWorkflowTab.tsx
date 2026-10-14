"use client";

/**
 * Workflow tab — every run this page started, read from what the server stored
 * (`workflow.run` + `workflow.node_outcome`): status, the definition the run actually used
 * (Open workflow), the run page (Open run), the run's input and each step's input and output,
 * untouched. Below: the PROPOSED workflow shapes for this surface (`mandate.proposal`).
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { formatDurationMs } from "@ai-matrx/kit/format";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { Badge, Button, RegionSkeleton, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import type { MandateProposal, NodeOutcomeRow, RunTruth } from "../data";
import { BuilderJson } from "./BuilderJson";
import { ProposalCard } from "./ProposalCard";
import { AiTestReplayBadge } from "@/features/ai-test-mode/AiTestReplayBadge";

type Tone = "neutral" | "success" | "warning" | "destructive" | "info";
const STATUS_TONE: Record<string, Tone> = {
  completed: "success",
  running: "info",
  pending: "info",
  interrupted: "warning",
  failed: "destructive",
  errored: "destructive",
  cancelled: "neutral",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function StepRow({ o, open, onToggle }: { o: NodeOutcomeRow; open: boolean; onToggle: () => void }) {
  const { format } = useCostDisplay();
  const out = record(o.output);
  const cost = typeof out.cost_usd === "number" ? out.cost_usd : null;
  const reqs = Array.isArray(out.requests) ? out.requests.length : 0;
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        data-clickable
        onClick={onToggle}
        className="flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left hover:bg-accent/50"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate font-mono text-xs">{o.nodeId}</span>
        {o.error ? <Badge tone="destructive">error</Badge> : out.skipped === true ? <Badge>skipped</Badge> : <Badge tone="success">done</Badge>}
        <AiTestReplayBadge output={o.output} />
        {reqs ? <span className="text-[11px] tabular-nums text-muted-foreground">{reqs} req</span> : null}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          <span>{formatDurationMs(o.durationMs, { style: "compact", precision: "fine" })}</span>
          {cost ? <span>{format(cost)}</span> : null}
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <BuilderJson data={o.input} label="Input" location={`Workflow · step ${o.nodeId} · input`} className="h-56" />
          <BuilderJson data={o.output} label="Output" location={`Workflow · step ${o.nodeId} · output`} className="h-80" />
          {o.error ? <BuilderJson data={o.error} label="Error" location={`Workflow · step ${o.nodeId} · error`} className="h-40" /> : null}
        </div>
      ) : null}
    </li>
  );
}

export function BuilderWorkflowTab({
  runs,
  truth,
  truthError,
  focus,
  proposals,
  proposalsError,
}: {
  runs: { runId: string; label: string; at: number }[];
  truth: RunTruth | null;
  truthError: string | null;
  /** A run (and step) to show first — set by Activity. */
  focus: { runId: string; nodeId: string | null } | null;
  proposals: MandateProposal[] | null;
  proposalsError: string | null;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<string | null>(focus?.nodeId ?? null);
  const [showInput, setShowInput] = useState(false);
  const ordered = [...runs].sort((a, b) => b.at - a.at);
  const currentId = picked ?? focus?.runId ?? ordered[0]?.runId ?? null;
  const current = ordered.find((r) => r.runId === currentId) ?? ordered[0] ?? null;
  const run = truth?.runs.find((r) => r.id === current?.runId) ?? null;
  const steps = (truth?.outcomes ?? []).filter((o) => o.runId === current?.runId);
  const options: SelectOption<string>[] = ordered.map((r) => ({ value: r.runId, label: r.label }));
  const shapes = (proposals ?? []).filter((p) => p.shapeType === "workflow");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-3">
      {current ? (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {ordered.length > 1 ? (
              <Select aria-label="Run" value={current.runId} onValueChange={setPicked} options={options} />
            ) : (
              <span className="truncate text-sm font-semibold">{current.label}</span>
            )}
            {run ? <Badge tone={STATUS_TONE[run.status] ?? "info"}>{run.status}</Badge> : null}
            <div className="ml-auto flex items-center gap-1">
              {run ? (
                <Button variant="quiet" asChild icon={<ExternalLink className="h-3.5 w-3.5" />}>
                  <OutboundLink href={`/workflows/${run.definitionId}`}>Open workflow</OutboundLink>
                </Button>
              ) : null}
              <Button variant="quiet" asChild icon={<ExternalLink className="h-3.5 w-3.5" />}>
                <OutboundLink href={runHref(current.runId)}>Open run</OutboundLink>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 font-mono text-[11px] text-muted-foreground">
            <span>run {current.runId}</span>
            {run ? <span>definition {run.definitionId}</span> : null}
          </div>
          {truthError ? <p className="text-xs text-destructive">{truthError}</p> : null}
          {truth === null && !truthError ? <RegionSkeleton shape="rows" count={4} /> : null}
          {run ? (
            <>
              <button
                type="button"
                data-clickable
                onClick={() => setShowInput((s) => !s)}
                className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
              >
                {showInput ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Run input
              </button>
              {showInput ? <BuilderJson data={run.input} label="Run input" location="Workflow · run input" className="h-56" /> : null}
            </>
          ) : null}
          {steps.length ? (
            <ol className="rounded-md border border-border">
              {steps.map((o) => (
                <StepRow
                  key={o.id}
                  o={o}
                  open={openStep === o.id || openStep === o.nodeId}
                  onToggle={() => setOpenStep((s) => (s === o.id || s === o.nodeId ? null : o.id))}
                />
              ))}
            </ol>
          ) : truth ? (
            <p className="text-xs text-muted-foreground">No step finished yet</p>
          ) : null}
        </section>
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
