"use client";

/**
 * ProgressRailReadout — the podcast progress rail, generalized: one status
 * row per node fed ONLY by the workflowRuns selectors, plus authored
 * SYNTHETIC sub-steps (the podcast pattern, `features/podcasts/generator/
 * useStageDisplay.ts`): while a node with configured labels runs, its labels
 * advance one at a time on a randomized 2.2–5.5s cadence, the LAST one holds
 * until the node's aggregate phase leaves "running", then everything snaps
 * done instantly. A node that settles early snaps all done.
 *
 * Progress is presentation-local state — a refresh restarts the animation,
 * which is acceptable (the truth is the selectors, the cadence is theater).
 * The header bar caps at 99% until the run status is terminal (podcast law).
 *
 * Renders BARE — the readout frame (border/bg/title) is drawn by the host.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Eye, Loader2 } from "lucide-react";

import { useCanWatchAi } from "@/features/ai-watch/useCanWatchAi";
import { useWatchAiRun } from "@/features/overlays/openers/aiWatchWindow";
import type { NodeInvocationState } from "../redux/workflow-runs.slice";

import { useAppSelector } from "@/lib/redux/hooks";

import {
  selectNodeAggregate,
  selectNodeAggregatePhases,
  selectRunNodeOrder,
  selectRunStatus,
} from "../redux/workflow-runs.selectors";
import { runIsOver } from "../types";
import { PhaseIcon, PHASE_LABEL } from "./readout-parts";

/** Randomized synthetic cadence — the podcast rail's proven feel. */
const SYNTH_STEP_MIN_MS = 2200;
const SYNTH_STEP_JITTER_MS = 3300;

function SyntheticSubSteps({
  labels,
  nodeRunning,
  nodeStarted,
}: {
  labels: string[];
  /** Aggregate phase is exactly "running". */
  nodeRunning: boolean;
  /** The node has left idle/waiting (running or already settled/failed…). */
  nodeStarted: boolean;
}) {
  const [doneCount, setDoneCount] = useState(0);

  // Advance one sub-step on a randomized timer chain (one chain per mounted
  // running node); HOLD the last sub-step until the real node settles. The
  // timeout cleanup on unmount/phase-change ends the chain.
  useEffect(() => {
    if (!nodeRunning) return undefined;
    if (doneCount >= labels.length - 1) return undefined;
    const id = setTimeout(
      () => setDoneCount((c) => c + 1),
      SYNTH_STEP_MIN_MS + Math.random() * SYNTH_STEP_JITTER_MS,
    );
    return () => clearTimeout(id);
  }, [nodeRunning, doneCount, labels.length]);

  if (!nodeStarted) return null;

  // Left "running" (settled/failed/skipped) → ALL done instantly, no lag.
  const synthDone = nodeRunning ? doneCount : labels.length;

  return (
    <div className="ml-6 space-y-0.5">
      {labels.map((label, i) => {
        if (i > synthDone) return null; // not revealed yet
        const done = i < synthDone;
        return (
          <div
            key={`${i}-${label}`}
            className="flex items-center gap-1.5 text-[11px]"
          >
            {done ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
            ) : (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
            )}
            <span
              className={done ? "text-muted-foreground" : "text-foreground"}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A step that makes an AI call (`ai.mandate.start`, `ai.agent.start`, `ai.agent.produce`, …). */
export function isAiStep(specType: string | null): boolean {
  return Boolean(specType && specType.startsWith("ai."));
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

/** How long the step took (settled), or has been working (running, ticking). */
function StepTiming({ invocations, running }: { invocations: NodeInvocationState[]; running: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const starts = invocations.map((i) => (i.startedAt ? Date.parse(i.startedAt) : NaN)).filter(Number.isFinite);
  const durations = invocations.map((i) => i.durationMs).filter((d): d is number => typeof d === "number");
  let ms: number | null = null;
  if (running && starts.length) ms = now - Math.min(...starts);
  else if (durations.length) ms = Math.max(...durations);
  if (ms === null) return null;
  return <span className="tabular-nums">{formatMs(ms)} · </span>;
}

function RailNodeRow({
  runId,
  nodeId,
  label,
  syntheticLabels,
}: {
  runId: string;
  nodeId: string;
  /** Human step name from the definition — the id/specType are fallbacks. */
  label?: string;
  syntheticLabels?: string[];
}) {
  const aggregate = useAppSelector(selectNodeAggregate(runId, nodeId));
  const { phase, invocations, specType, expectedCount, settledCount } = aggregate;
  const fanOut = expectedCount > 1 || invocations.length > 1;
  const nodeRunning = phase === "running";
  const nodeStarted = phase !== "idle" && phase !== "waiting";
  // AI steps are marked, and (for people who may watch AI) open Watch AI on this step's call.
  const ai = isAiStep(specType);
  const canWatch = useCanWatchAi();
  const watch = useWatchAiRun();
  const laneRequestId = invocations.find((i) => i.laneRequestId)?.laneRequestId ?? null;
  const watchable = ai && canWatch && nodeStarted;
  const open = () =>
    watch({ requestId: laneRequestId, workflowRunId: runId, nodeId, label: label ?? nodeId });

  const head = (
    <>
      <PhaseIcon phase={phase} />
      <span className="truncate text-xs font-medium">{label ?? specType ?? nodeId}</span>
      {ai ? (
        <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">AI</span>
      ) : null}
      {watchable ? <Eye className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
        {fanOut ? `${settledCount}/${Math.max(expectedCount, invocations.length)} · ` : ""}
        <StepTiming invocations={invocations} running={nodeRunning} />
        {PHASE_LABEL[phase] ?? phase}
      </span>
    </>
  );

  return (
    <div className="space-y-0.5" data-step={nodeId} data-phase={phase} data-ai={ai ? "true" : undefined}>
      {watchable ? (
        <button
          type="button"
          onClick={open}
          title="Watch this AI call"
          className="flex w-full items-center gap-1.5 rounded text-left hover:bg-muted"
        >
          {head}
        </button>
      ) : (
        <div className="flex items-center gap-1.5">{head}</div>
      )}
      {syntheticLabels && syntheticLabels.length > 0 ? (
        <SyntheticSubSteps
          labels={syntheticLabels}
          nodeRunning={nodeRunning}
          nodeStarted={nodeStarted}
        />
      ) : null}
    </div>
  );
}

export function ProgressRailReadout({
  runId,
  nodeIds,
  nodeLabels,
  syntheticSteps,
}: {
  runId: string;
  /** Nodes the rail narrates, in this order; absent = the run's node order. */
  nodeIds?: string[];
  /** nodeId → human step name (from the definition). */
  nodeLabels?: Record<string, string>;
  /** Authored synthetic sub-step labels per nodeId. */
  syntheticSteps?: Record<string, string[]>;
}) {
  const runStatus = useAppSelector(selectRunStatus(runId));
  const runNodeOrder = useAppSelector(selectRunNodeOrder(runId));
  const phases = useAppSelector(selectNodeAggregatePhases(runId));

  const nodes = nodeIds && nodeIds.length > 0 ? nodeIds : runNodeOrder;
  const total = nodes.length;
  const settled = nodes.filter((nodeId) => {
    const phase = phases[nodeId];
    return phase === "settled" || phase === "skipped";
  }).length;

  const terminal = runIsOver(runStatus);
  const rawPct = total > 0 ? Math.round((settled / total) * 100) : 0;
  // The podcast law: never show 100% while the run can still move.
  const pct = terminal ? rawPct : Math.min(99, rawPct);

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            {settled}/{total} steps done
          </span>
          <span className="ml-auto tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {total === 0 ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CircleDashed className="h-3 w-3" />
          Waiting for the run to start
        </div>
      ) : (
        <div className="space-y-1">
          {nodes.map((nodeId) => (
            <RailNodeRow
              key={nodeId}
              runId={runId}
              nodeId={nodeId}
              label={nodeLabels?.[nodeId]}
              syntheticLabels={syntheticSteps?.[nodeId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
