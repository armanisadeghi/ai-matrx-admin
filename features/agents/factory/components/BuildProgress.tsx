"use client";

/**
 * BuildProgress — the ONE progress primitive every agent-creating door mounts
 * while an Agent Factory build runs (PLAN-CUTOVER P2 + P6, rulings R34/R35).
 *
 * Compact form of the admin `FactoryBuildPage`: the same timeline rows
 * (`buildRows`, `StatusIcon`) folded to one row per step, live while the build
 * runs (polls the build's latest checkpoint every 3s, read straight from the
 * spine under the person's own RLS — they started it), then the honest outcome:
 *  - passed → open the agent;
 *  - saved unproven → the badge; its first 3 real runs are judged;
 *  - refused with a saved draft (archived, R15) → today's agent stays, the
 *    reasons, and "Keep it anyway" (un-archives, marked unproven — O4);
 *  - too few examples → "Build unproven" (R34, a person's choice; the server
 *    refuses it on headless doors);
 *  - needs a new shape / a workflow / an error → said plainly.
 * Admins get a link to the full build page (the way into the admin section).
 */

import { ErrorNotice } from "@ai-matrx/design-system";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import Link from "@/components/navigation/AppLink";
import { useRouter } from "next/navigation";
import { ExternalLink, Repeat } from "lucide-react";
import { Badge, Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import { outcomeChip } from "@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks";
import { StateChip, isRecord } from "@/components/mardown-display/blocks/result-kinds/result-kind-shared";
import { plainBuildState } from "../plain-stop-reason";
import { keepBuildAnyway, startAgentBuild } from "../service";
import { answerBuildGate } from "../build-run-service";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { useBuildDetail } from "../useBuildDetail";
import type { BuildGate } from "../build-run";
import {
  KEPT_OUTCOMES,
  STEP_LABEL,
  spineIsOver,
  type FactoryBuildDetail,
  type FactoryBuildState,
  type FactoryStepName,
  type SpineStatus,
} from "../types";
import { buildRows, StatusIcon, type RowStatus } from "./FactoryBuildPage";
import { formatDuration } from "./factory-shared";
import { refineAgentHref } from "../refine-link";
import { catalogProseText } from "@/features/content-ir/surfaces/kind-one-line";

/** A proof case's result, from the new agent's side. */
const CASE_WORD: Record<string, string> = { candidate: "won", baseline: "lost", tie: "tie", both_fail: "both failed" };
const ADMIN_BUILD_PATH = "/administration/agents/factory";

export interface BuildProgressProps {
  buildId: string;
  /** Called once when the build ends (any outcome) — doors use it to pick up the agent id. */
  onFinished?: (state: FactoryBuildState) => void;
  /** Called when the person starts a follow-up build (Build unproven) — the door tracks the new id. */
  onRebuilt?: (buildId: string) => void;
  /** Called with the agent "Keep it anyway" kept — a door that places the agent (a mandate's holder) uses it. */
  onKept?: (agentId: string) => void;
  /**
   * R58: the moment a build keeps a NEW agent (passed or saved), go to it in the builder
   * with the Side Chat open beside it (`refineAgentHref`). Doors that place the agent
   * somewhere themselves (a mandate's holder controls) leave this off.
   */
  forwardWhenKept?: boolean;
  /**
   * A stopped build's "Edit description": the door reopens its description box holding this
   * request's own words. Doors with no box leave it off (Try again still shows).
   */
  onEditDescription?: (description: string) => void;
  className?: string;
}

interface StepCell {
  step: FactoryStepName;
  status: RowStatus;
  attempts: number;
}

/** One cell per step, latest status wins; attempts count the send-back loops. */
function stepCells(detail: FactoryBuildDetail): StepCell[] {
  const cells = new Map<FactoryStepName, StepCell>();
  for (const row of buildRows(detail)) {
    if (row.label) continue;
    const prev = cells.get(row.step);
    cells.set(row.step, {
      step: row.step,
      status: row.status,
      attempts: Math.max(prev?.attempts ?? 0, row.attempt ?? 1),
    });
  }
  return [...cells.values()];
}

function decisionReason(state: FactoryBuildState): string | null {
  const decision = (state as Record<string, unknown>).pass_decision;
  if (isRecord(decision) && typeof decision.reason === "string") return decision.reason;
  return null;
}

/**
 * The contract step thought a workflow might serve better. The agent is built anyway (the
 * default, already running); planning it as a workflow is one click away in a new tab.
 */
export function WorkflowSuggestion({ suggestion }: { suggestion: NonNullable<FactoryBuildState["workflow_suggestion"]> }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const steps = (suggestion.proposed_steps ?? []).filter((x) => x.trim());
  return (
    <div data-testid="workflow-suggestion" className="flex min-w-0 flex-col gap-1.5 border-t border-border pt-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 type-body">Building it as one agent. A workflow is an option.</span>
        <span className="ml-auto flex items-center gap-2">
          <Button variant="primary" onClick={() => setDismissed(true)}>
            Continue as one agent
          </Button>
          <Button asChild variant="outline">
            <Link href={WORKFLOW_PLAN_PATH} target="_blank" rel="noopener noreferrer">
              Plan it as a workflow
            </Link>
          </Button>
        </span>
      </div>
      {steps.length > 0 ? (
        <details className="type-secondary text-muted-foreground">
          <summary className="cursor-pointer">{`${steps.length} suggested steps`}</summary>
          <ol className="mt-1 list-decimal pl-5">
            {steps.map((step, i) => (
              <li key={i} className="line-clamp-2">
                {step}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

/** The workflow offer and "Keep it anyway" of a workflow build: the run waits here until answered. */
export function GateCard({ gate, busy, onAnswer }: { gate: BuildGate; busy: boolean; onAnswer: (value: string) => void }) {
  return (
    <div data-testid={`build-gate-${gate.kind}`} className="flex min-w-0 flex-col gap-1.5 border-t border-border pt-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="min-w-0 type-body">{gate.prompt || gate.title}</span>
        <span className="ml-auto flex items-center gap-2">
          {gate.options.map((option) => (
            <Button
              key={option.value}
              variant={option.value === gate.defaultValue ? "primary" : "outline"}
              disabled={busy}
              onClick={() => onAnswer(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </span>
      </div>
    </div>
  );
}

const PROOF_STEPS: ReadonlySet<FactoryStepName> = new Set<FactoryStepName>(["proof", "proof_review"]);
export const PROOF_SKIPPED_LINE = "No examples to prove it on. Its first 3 runs are judged.";

/** The build was asked unproven and no proof case ran: Proof and Judge are not coming. */
export function proofSkippedFor(state: FactoryBuildState | null | undefined): boolean {
  if (!state?.request?.unproven) return false;
  return (state.proof?.length ?? 0) === 0;
}

/** Where "Plan it as a workflow" opens: the Orchestras home (teams of agents under a conductor). */
export const WORKFLOW_PLAN_PATH = "/agents/orchestras";

/** The caller's format line for "Build it as text" — read by the factory as a text answer (R46). */
export const TEXT_ANSWER_FORMAT = "Markdown text";

function OutcomePanel({
  state: storedState,
  spineStatus,
  busy,
  onKeep,
  onBuildUnproven,
  onBuildAsText,
  onRetry,
  onEditDescription,
}: {
  state: FactoryBuildState;
  /** The execution's real status — the checkpoint can still say running after a worker died. */
  spineStatus: SpineStatus;
  busy: boolean;
  onKeep: () => void;
  onBuildUnproven: () => void;
  /** needs_new_kind: build it now with a text answer (the shape proposal stays filed). */
  onBuildAsText: () => void;
  /** A build that stopped: the same request again. */
  onRetry: () => void;
  /** Back to the door's description box with the request's own words in it (doors that have one). */
  onEditDescription?: () => void;
}) {
  // An older build still stores developer text as its reason; the person reads the plain line.
  const state = plainBuildState(storedState) as FactoryBuildState;
  // A build whose worker died before the reaper settled it: the spine says failed or
  // canceled while the checkpoint never got an outcome — show it stopped, never blank.
  const outcome =
    state.outcome ?? (spineStatus === "failed" || spineStatus === "cancelled" ? "worker_lost" : null);
  const greenfield = state.facts?.greenfield ?? !state.request?.mandate_key;
  const agentId = state.agent_id ?? null;
  const kept = Boolean(outcome && KEPT_OUTCOMES.has(outcome));
  const reason = decisionReason(state);

  const openAgent = agentId ? (
    <Button asChild variant="primary">
      <Link href={refineAgentHref(agentId)}>Open agent</Link>
    </Button>
  ) : null;

  let line: string | null = null;
  let actions: React.ReactNode = null;
  if (outcome === "passed") {
    line = "Ready. It passed its proof.";
    actions = openAgent;
  } else if (outcome === "saved_unproven") {
    line = "Saved. Its first 3 runs prove it.";
    actions = openAgent;
  } else if ((outcome === "send_backs_exhausted" || outcome === "judge_not_blind") && agentId) {
    line = greenfield
      ? "The draft did not pass your examples."
      : "Today's agent stays. The new draft did not beat it.";
    actions = (
      <Button variant="outline" onClick={onKeep} disabled={busy}>
        Keep it anyway
      </Button>
    );
  } else if (outcome === "unproven") {
    line = "Not kept. Too few real cases to prove it.";
    actions = agentId ? (
      <Button variant="outline" onClick={onKeep} disabled={busy}>
        Keep it anyway
      </Button>
    ) : (
      <Button variant="outline" onClick={onBuildUnproven} disabled={busy}>
        Build anyway
      </Button>
    );
  } else if (outcome === "no_proof_inputs") {
    line = "The proof needs 3 example inputs.";
    actions = (
      <Button variant="outline" onClick={onBuildUnproven} disabled={busy}>
        Build anyway
      </Button>
    );
  } else if (outcome === "needs_new_kind") {
    // The shape proposal is filed for the kinds lane either way; a person is never left with
    // no way forward — the same job, built now with a text answer.
    line = "It needs a new output shape. Text works today.";
    actions = (
      <Button variant="outline" onClick={onBuildAsText} disabled={busy}>
        Build it as text
      </Button>
    );
  } else if (outcome) {
    line = outcome === "worker_lost" ? "Stopped mid-build." : "The build stopped.";
    actions = (
      <Button variant="outline" onClick={onBuildUnproven} disabled={busy}>
        Build anyway
      </Button>
    );
  }
  // Every build that was not kept ends with the person's own words one press away and Try again —
  // never a dead end, whatever the outcome (owner 2026-10-19; build-never-a-dead-end.test.tsx).
  const stopped = Boolean(outcome) && !kept;
  if (stopped) {
    actions = (
      <>
        {actions}
        {onEditDescription ? (
          <Button variant="outline" onClick={onEditDescription} disabled={busy}>
            Edit description
          </Button>
        ) : null}
        <Button variant="primary" onClick={onRetry} disabled={busy}>
          Try again
        </Button>
      </>
    );
  }

  const cases = (state.proof ?? []).filter((c) => c.preferred);
  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-border pt-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {outcomeChip(outcome)}
        {kept && outcome === "saved_unproven" ? <Badge tone="warning">Unproven</Badge> : null}
        {line ? <span className="min-w-0 type-body">{line}</span> : null}
        <span className="ml-auto flex items-center gap-2">{actions}</span>
      </div>
      {cases.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {cases.map((c, i) => (
            <StateChip
              key={c.case_id}
              label={`Case ${i + 1} · ${CASE_WORD[c.preferred ?? ""] ?? c.preferred}`}
              tone={c.preferred === "candidate" ? "good" : c.preferred === "baseline" || c.preferred === "both_fail" ? "bad" : "neutral"}
            />
          ))}
        </div>
      ) : null}
      {!kept && (reason || state.error) ? (
        <div data-testid="build-failure-reason" className="line-clamp-3">
          {/* A kind carried in the reason reads as its one-line label (L-5, round 9). */}
          <ErrorNotice title="The build stopped" message={catalogProseText(reason ?? state.error)} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Done polling: the spine row is over AND, for a kept outcome, the saved agent's id is on the record —
 * or the id never came after `MAX_POLLS_FOR_AGENT_ID` polls past the end (then the end is reported
 * as it stands). Exported for `build-progress-settled.test.ts`.
 */
export const MAX_POLLS_FOR_AGENT_ID = 10;
export function buildIsSettled(
  detail: Pick<FactoryBuildDetail, "spineStatus" | "state">,
  pollsSoFar: number,
): boolean {
  if (!spineIsOver(detail.spineStatus)) return false;
  const outcome = detail.state?.outcome;
  const kept = Boolean(outcome && KEPT_OUTCOMES.has(outcome));
  if (!kept || detail.state?.agent_id) return true;
  return pollsSoFar >= MAX_POLLS_FOR_AGENT_ID;
}

export function BuildProgress({ buildId, onFinished, onRebuilt, onKept, forwardWhenKept, onEditDescription, className }: BuildProgressProps) {
  const router = useRouter();
  // A "Build unproven" follow-up replaces the build this view tracks.
  const [rebuiltId, setRebuiltId] = useState<string | null>(null);
  const currentId = rebuiltId ?? buildId;
  const dispatch = useAppDispatch();
  // The latest read of the build (either id shape), tagged with the id it belongs to.
  const { snap, reload } = useBuildDetail(currentId);
  const detail = snap ? snap.detail : undefined;
  const error = snap ? snap.error : null;
  const gate = snap?.gate ?? null;
  const [busy, setBusy] = useState(false);
  const [keptAgent, setKeptAgent] = useState<string | null>(null);
  const isAdmin = useAppSelector(selectIsAdminPerson);

  const over = detail ? spineIsOver(detail.spineStatus) : false;
  // A kept build reports its end once the saved agent's id is on the record too (it can land a poll
  // after the spine row closes), so the caller can move straight to the agent.
  const settled = detail ? buildIsSettled(detail, snap?.polls ?? 0) : false;

  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (over && settled && detail?.state && reported.current !== currentId) {
      reported.current = currentId;
      onFinished?.(detail.state);
      const kept = detail.state.outcome && KEPT_OUTCOMES.has(detail.state.outcome) ? detail.state.agent_id : null;
      if (forwardWhenKept && kept) router.push(refineAgentHref(kept));
    }
  }, [over, settled, detail, currentId, onFinished, forwardWhenKept, router]);

  // An unproven build (build-first: no examples to prove it on) never runs Proof or Judge — its
  // first 3 real runs are judged instead. Those steps read as skipped, with the reason, never as
  // steps still waiting (review 2026-10-20, beekeeping build 3a3aea1d).
  const proofSkipped = proofSkippedFor(detail?.state);
  const cells = (detail ? stepCells(detail) : []).map((c) =>
    proofSkipped && PROOF_STEPS.has(c.step) && c.status === "pending" ? { ...c, status: "skipped" as const } : c,
  );

  const keep = async () => {
    setBusy(true);
    try {
      const savedId = detail?.state?.agent_id;
      if (!savedId) throw new Error("This build has no saved draft to keep");
      const agentId = await keepBuildAnyway(savedId);
      setKeptAgent(agentId);
      onKept?.(agentId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not keep the draft");
    } finally {
      setBusy(false);
    }
  };

  /** The workflow offer, or "Keep it anyway" on a running workflow build: one answer, then the run goes on. */
  const answer = async (g: BuildGate, value: string) => {
    setBusy(true);
    try {
      await answerBuildGate(dispatch, g, value);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The answer did not go through");
    } finally {
      setBusy(false);
    }
  };

  /** A follow-up build of the same request: unproven (R34), the same job as text (R46), or a retry. */
  const rebuild = async (how: "unproven" | "as_text" | "retry") => {
    const req = detail?.state?.request;
    if (!req?.spec) return;
    setBusy(true);
    try {
      // The follow-up keeps the door that started this build, and a builtin stays a builtin
      // (an ownerless spec; the server honors it for admins only).
      const next = await startAgentBuild({
        spec: how === "as_text" ? { ...req.spec, response_format: TEXT_ANSWER_FORMAT } : req.spec,
        mandateKey: req.mandate_key ? storedMandateKey(req.mandate_key) : null,
        unproven: how === "unproven" || (how === "retry" && Boolean(req.unproven)),
        door: req.door ?? null,
        builtin: req.spec.owner === null,
      });
      setRebuiltId(next);
      onRebuilt?.(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the build");
    } finally {
      setBusy(false);
    }
  };

  if (detail === undefined && !error) {
    return <RegionSkeleton shape="rows" count={3} aria-label="Loading build" className={className} />;
  }
  if (error || !detail) {
    return error ? (
      <ErrorNotice title="Build not loaded" message={error} operation="load the agent build" size="compact" className={className} />
    ) : (
      <div className={cn("rounded-md border border-border p-3 type-body text-muted-foreground", className)}>No build has this id.</div>
    );
  }

  const state = detail.state ?? {};
  const name = (state.request?.spec?.display_name as string | undefined) ?? "New agent";
  const sendBacks = state.send_backs ?? 0;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2.5 rounded-md border border-border bg-card p-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate type-title">{name}</span>
        {!over ? <StateChip label="Building" tone="accent" /> : null}
        {sendBacks > 0 ? (
          <StateChip label={`${sendBacks} send-back${sendBacks === 1 ? "" : "s"}`} tone="warn" icon={<Repeat className="size-3" />} />
        ) : null}
        <span className="ml-auto shrink-0 type-secondary tabular-nums text-muted-foreground">
          {formatDuration(detail.startedAt ?? detail.createdAt, detail.endedAt ?? new Date().toISOString())}
        </span>
        {snap?.kind === "run" ? (
          <Link href={runHref(currentId)} className="flex shrink-0 items-center gap-1 type-secondary text-primary hover:underline">
            Open run
            <ExternalLink className="size-3" />
          </Link>
        ) : null}
        {isAdmin ? (
          <Link
            href={`${ADMIN_BUILD_PATH}/${currentId}`}
            className="flex shrink-0 items-center gap-1 type-secondary text-primary hover:underline"
          >
            Full build
            <ExternalLink className="size-3" />
          </Link>
        ) : null}
      </div>

      <ol className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        {cells.map((c) => (
          <li
            key={c.step}
            className={cn("flex items-center gap-1.5 type-secondary", c.status === "pending" && "opacity-50")}
            aria-current={c.status === "running" ? "step" : undefined}
          >
            <StatusIcon status={c.status} />
            <span className={cn(c.status === "running" && "font-medium")}>{STEP_LABEL[c.step]}</span>
            {c.attempts > 1 ? <span className="tabular-nums text-muted-foreground">×{c.attempts}</span> : null}
          </li>
        ))}
      </ol>

      {proofSkipped ? (
        <p data-testid="proof-skipped" className="type-secondary text-muted-foreground">
          {PROOF_SKIPPED_LINE}
        </p>
      ) : null}

      {state.workflow_suggestion ? <WorkflowSuggestion suggestion={state.workflow_suggestion} /> : null}

      {gate ? <GateCard gate={gate} busy={busy} onAnswer={(value) => void answer(gate, value)} /> : null}

      {over ? (
        keptAgent ? (
          <div className="flex items-center gap-2 border-t border-border pt-2.5">
            <Badge tone="warning">Unproven</Badge>
            <span className="type-body">Kept. Its first 3 runs are judged.</span>
            <Button asChild variant="primary" className="ml-auto">
              <Link href={`/agents/${keptAgent}/build`}>Open agent</Link>
            </Button>
          </div>
        ) : (
          <OutcomePanel state={state} spineStatus={detail.spineStatus} busy={busy} onKeep={() => void keep()} onBuildUnproven={() => void rebuild("unproven")} onBuildAsText={() => void rebuild("as_text")} onRetry={() => void rebuild("retry")}
            onEditDescription={
              onEditDescription && typeof state.request?.spec?.purpose === "string"
                ? () => onEditDescription(String(state.request?.spec?.purpose))
                : undefined
            }
          />
        )
      ) : null}
    </div>
  );
}
