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

import { useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import {
  selectNodeAggregate,
  selectRunEmissions,
  selectRunStatus,
} from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { evidenceFromPayload, type EvidenceItem } from "./evidence";

/** The steps a Smart Add workflow shows, in order (at most three; identify has two). */
export type SmartAddStepPair = readonly [string, string] | readonly [string, string, string];
export const IDENTIFY_STEPS: SmartAddStepPair = ["website", "socials"];
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

function useStep(runId: string, step: string): { view: StepView; evidence: EvidenceItem[] } {
  const aggregate = useAppSelector(selectNodeAggregate(runId, step));
  const invocation = aggregate.invocations[aggregate.invocations.length - 1] ?? null;
  const output = invocation?.output ?? null;
  const notes = Array.isArray(output?.notes) ? output.notes.filter((n): n is string => typeof n === "string") : [];
  const errorNote = invocation?.error?.message ? [invocation.error.message] : [];
  return {
    view: {
      step,
      phase: aggregate.phase,
      progress: invocation?.progress?.message ?? null,
      notes: [...notes, ...errorNote],
      costUsd: numberOr(output?.cost_usd, 0),
      skipped: output?.skipped === true,
    },
    evidence: evidenceFromPayload(output),
  };
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
  const website = useStep(runId, steps[0]);
  const socials = useStep(runId, steps[1]);
  const third = useStep(runId, steps[2] ?? "");

  const live = emissions.flatMap((e) => evidenceFromPayload(e.payload));
  const all = [...live, ...website.evidence, ...socials.evidence, ...third.evidence];
  // Both callbacks are idempotent on unchanged content (the screen keeps its
  // state when nothing new arrived), so running on every render is safe.
  useEffect(() => {
    if (all.length) onEvidence?.(all);
  }, [all, onEvidence]);

  const view: RoundView = { runId, status, steps: steps[2] ? [website.view, socials.view, third.view] : [website.view, socials.view] };
  useEffect(() => {
    onView(view);
  }, [view, onView]);

  return null;
}
