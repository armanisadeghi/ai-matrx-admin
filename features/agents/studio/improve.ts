/**
 * Mode "Improve an agent I have": the agent's recent real runs become its test cases (the ONE
 * test-case store, `agent.exemplar`, via `borrowSampleFromRun`) and the latest one opens in the
 * center. Runs the Studio itself launched are the person's tries, not the agent's real work, so
 * they are used only when the agent has no other runs.
 */

import type { CandidateRun } from "@/features/agents/samples/service";

/** How many recent runs become test cases on open. */
export const IMPROVE_CASES_FROM_RUNS = 5;
export const STUDIO_SOURCE_FEATURE = "agent-studio";

export interface ImprovePlan {
  /** The run the center opens on (the latest real run), or null when the agent never ran. */
  latest: CandidateRun | null;
  /** Runs to save as test cases (newest first), never one that already is a case. */
  borrow: CandidateRun[];
}

export function planImprove(
  runs: readonly CandidateRun[],
  alreadyCases: ReadonlySet<string>,
  limit: number = IMPROVE_CASES_FROM_RUNS,
): ImprovePlan {
  const real = runs.filter((r) => r.sourceFeature !== STUDIO_SOURCE_FEATURE);
  const pool = real.length > 0 ? real : [...runs];
  const hasInput = (r: CandidateRun) =>
    Boolean(r.userInput?.trim()) || Object.keys(r.variables ?? {}).length > 0 || r.inputContent.length > 0;
  const usable = pool.filter(hasInput);
  return {
    latest: usable[0] ?? pool[0] ?? null,
    borrow: usable.slice(0, limit).filter((r) => !alreadyCases.has(r.conversationId)),
  };
}

/** Who can revise an agent (the picker's filter): its owner, or someone it is shared with to edit. */
export function canEditAgent(agent: { isOwner: boolean | null; accessLevel: string | null }): boolean {
  return agent.isOwner === true || agent.accessLevel === "owner" || agent.accessLevel === "admin" || agent.accessLevel === "editor";
}
