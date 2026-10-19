import type { ToolLifecycleEntry } from "@ai-matrx/chat/agents/types/request.types";
import type { ToolPhaseLabels } from "@ai-matrx/chat/tool-call-visualization/types";

import type { ComparePhase } from "./useCompareRun";
import { parseCompare } from "./parseCompare";

/**
 * Where each compare card's run stands, by reserved run id. The card writes it as the run moves; the
 * tool row (a separate component, outside the card) reads it, so the row never says "Ready to compare"
 * after the person has pressed Compare. A reload starts empty and the card refills it on mount.
 */
const phases = new Map<string, ComparePhase>();

export function setCompareRunPhase(runId: string | null, phase: ComparePhase): void {
  if (runId) phases.set(runId, phase);
}

/** The words for a run's stage: Finding, Ready to confirm, Comparing, Done, Failed. */
export function compareStageLabel(phase: ComparePhase | undefined): string {
  switch (phase) {
    case "starting":
    case "running":
      return "Comparing";
    case "done":
      return "Comparison done";
    case "failed":
      return "Comparison failed";
    case "confirm":
      return "Ready to confirm";
    default:
      return "Finding what to compare";
  }
}

/** The slim row's labels for one compare call: they follow the run, not the call. */
export function comparePhaseLabels(entry: ToolLifecycleEntry): ToolPhaseLabels | null {
  const data = parseCompare(entry);
  if (!data) return null;
  if (data.status === "awaiting_confirmation") {
    const stage = compareStageLabel(data.runId ? phases.get(data.runId) : "confirm");
    return { running: "Finding what to compare", complete: stage === "Finding what to compare" ? "Ready to confirm" : stage, errorPrefix: "Compare failed" };
  }
  if (data.status === "needs_items") return { running: "Finding what to compare", complete: "Needs another thing to compare" };
  if (data.status === "needs_clarification") return { running: "Finding what to compare", complete: "Nothing found to compare" };
  if (data.status === "refused") return { running: "Finding what to compare", complete: "Compare stopped" };
  return null;
}

/** The confirm card is the answer while it needs the person (pick, fix, Compare) and while it runs. */
export function compareInlineVisibility(entry: ToolLifecycleEntry) {
  return parseCompare(entry)?.status === "awaiting_confirmation"
    ? { visibility: "pinned" as const, reason: "The card is where the person picks and presses Compare; folded away it is never seen." }
    : null;
}
