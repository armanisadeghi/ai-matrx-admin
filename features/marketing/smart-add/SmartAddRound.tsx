"use client";

/**
 * One evidence round = one run of the `smart_add_brand_identify` system
 * workflow. This adopts the run through the platform's Run Stream Adapter
 * (`useWorkflowRun`) and reports, as they arrive:
 *  - every evidence item (live `node_emitted` frames first, then each step's
 *    final output, so a lost frame never loses a finding);
 *  - each step's phase, progress line, notes and hard cost.
 * Renders nothing; the Smart Add screen owns the layout.
 */

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import {
  selectNodeAggregate,
  selectRunEmissions,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { evidenceFromPayload, type EvidenceItem } from "./evidence";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { SMART_ADD_SURFACE } from "./builderFeed";

/** The steps a Smart Add workflow shows, in order. */
export type SmartAddStepPair = readonly string[];
/** Identify: the raw tier (site, accounts, web) then the confirmed tiers (news/videos/images, local). */
export const IDENTIFY_STEPS: SmartAddStepPair = ["probe", "page", "avatars", "socials", "web", "deep", "local"];
export const SETUP_STEPS: SmartAddStepPair = ["logo", "accounts", "history"];

export interface StepView {
  step: string;
  phase: string;
  progress: string | null;
  notes: string[];
  costUsd: number;
  skipped: boolean;
}

export interface RoundView {
  runId: string;
  status: string | null;
  steps: StepView[];
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** One step of the run: its phase, progress, notes, cost, and the evidence in its final output. */
function StepWatch({
  runId,
  step,
  onStep,
}: {
  runId: string;
  step: string;
  onStep: (step: string, view: StepView, evidence: EvidenceItem[]) => void;
}) {
  const aggregate = useAppSelector(selectNodeAggregate(runId, step));
  const invocation = aggregate.invocations[aggregate.invocations.length - 1] ?? null;
  const output = invocation?.output ?? null;
  const notes = Array.isArray(output?.notes) ? output.notes.filter((n): n is string => typeof n === "string") : [];
  const errorNote = invocation?.error?.message ? [invocation.error.message] : [];
  const view: StepView = {
    step,
    phase: aggregate.phase,
    progress: invocation?.progress?.message ?? null,
    notes: [...notes, ...errorNote],
    costUsd: numberOr(output?.cost_usd, 0),
    // A step the run skipped (its facts were not there yet) reads as skipped, like one with nothing to do.
    skipped: output?.skipped === true || aggregate.phase === "skipped",
  };
  const signature = JSON.stringify({ view, evidence: evidenceFromPayload(output) });
  useEffect(() => {
    const { view: v, evidence } = JSON.parse(signature) as { view: StepView; evidence: EvidenceItem[] };
    onStep(step, v, evidence);
  }, [signature, step, onStep]);
  return null;
}

export function SmartAddRound({
  runId,
  steps = IDENTIFY_STEPS,
  onEvidence,
  onView,
}: {
  runId: string;
  steps?: SmartAddStepPair;
  onEvidence?: (items: EvidenceItem[]) => void;
  onView: (view: RoundView) => void;
}) {
  useWorkflowRun(runId);
  const status = useAppSelector(selectRunStatus(runId));
  const emissions = useAppSelector(selectRunEmissions(runId));
  const [stepState, setStepState] = useState<Record<string, { view: StepView; evidence: EvidenceItem[] }>>({});
  const onStep = (step: string, view: StepView, evidence: EvidenceItem[]) =>
    setStepState((s) => ({ ...s, [step]: { view, evidence } }));

  const live = emissions.flatMap((e) => evidenceFromPayload(e.payload));
  const all = [...live, ...steps.flatMap((s) => stepState[s]?.evidence ?? [])];
  // Both callbacks are idempotent on unchanged content (the screen keeps its
  // state when nothing new arrived), so running on every render is safe.
  useEffect(() => {
    if (all.length) onEvidence?.(all);
  }, [all, onEvidence]);

  const idle = (step: string): StepView => ({ step, phase: "idle", progress: null, notes: [], costUsd: 0, skipped: false });
  const view: RoundView = { runId, status, steps: steps.map((s) => stepState[s]?.view ?? idle(s)) };
  useEffect(() => {
    onView(view);
  }, [view, onView]);

  return (
    <>
      {steps.map((s) => (
        <StepWatch key={s} runId={runId} step={s} onStep={onStep} />
      ))}
    </>
  );
}
