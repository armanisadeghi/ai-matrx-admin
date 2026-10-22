/**
 * The non-AI steps of a workflow run, for the Watch AI rail beside its AI calls. An AI step
 * already appears as its call (a call's `nodeId` = the step's `node_id`); every other step
 * (`workflow.node_outcome` with no AI call) is listed so its outside answers can be watched too.
 */

import type { NodeOutcomeRow } from "./ai-watch-data-reads";

export const STEP_KEY_PREFIX = "step:";

export interface RailStep {
  key: string;
  outcomeId: string;
  label: string;
  step: number;
  failed: boolean;
  /** The step kept outside answers (a capture index with at least one raw entry). */
  hasRaw: boolean;
}

export function stepKey(outcomeId: string): string {
  return `${STEP_KEY_PREFIX}${outcomeId}`;
}

export function outcomeIdOf(key: string | null): string | null {
  return key && key.startsWith(STEP_KEY_PREFIX) ? key.slice(STEP_KEY_PREFIX.length) : null;
}

/** Per run: the latest attempt of every step that is not an AI call, in step order. */
export function railSteps(
  steps: readonly NodeOutcomeRow[],
  aiNodeIdsByRun: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, RailStep[]> {
  const latest = new Map<string, NodeOutcomeRow>();
  for (const s of steps) {
    const k = `${s.run_id}|${s.step}|${s.node_id}`;
    const seen = latest.get(k);
    if (!seen || s.attempt > seen.attempt) latest.set(k, s);
  }
  const byRun = new Map<string, RailStep[]>();
  for (const s of latest.values()) {
    if (aiNodeIdsByRun.get(s.run_id)?.has(s.node_id)) continue;
    const meta = s.metadata && typeof s.metadata === "object" ? (s.metadata as Record<string, unknown>) : {};
    const capture = meta.raw_capture && typeof meta.raw_capture === "object" ? (meta.raw_capture as { raw?: unknown }) : null;
    const list = byRun.get(s.run_id) ?? [];
    list.push({
      key: stepKey(s.id),
      outcomeId: s.id,
      label: s.node_id,
      step: s.step,
      failed: s.error != null,
      hasRaw: Array.isArray(capture?.raw) && capture.raw.length > 0,
    });
    byRun.set(s.run_id, list);
  }
  for (const list of byRun.values()) list.sort((a, b) => a.step - b.step || a.label.localeCompare(b.label));
  return byRun;
}
