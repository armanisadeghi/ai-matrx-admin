/**
 * Mode "Improve an agent I have": the latest real run opens in the center. Nothing is saved on
 * open: a run becomes a test case (the ONE store, `agent.exemplar`, via `borrowSampleFromRun`)
 * only when the person presses "Save as test case" on it (`runToSave`). Runs the Studio itself launched are the person's tries, not the agent's real work, so
 * they are used only when the agent has no other runs.
 */

import type { CandidateRun } from "@/features/agents/samples/service";

export const STUDIO_SOURCE_FEATURE = "agent-studio";

export interface ImprovePlan {
  /** The run the center opens on (the latest real run), or null when the agent never ran. */
  latest: CandidateRun | null;
}

export function planImprove(runs: readonly CandidateRun[]): ImprovePlan {
  const real = runs.filter((r) => r.sourceFeature !== STUDIO_SOURCE_FEATURE);
  const pool = real.length > 0 ? real : [...runs];
  const hasInput = (r: CandidateRun) =>
    Boolean(r.userInput?.trim()) || Object.keys(r.variables ?? {}).length > 0 || r.inputContent.length > 0;
  const usable = pool.filter(hasInput);
  return { latest: usable[0] ?? pool[0] ?? null };
}

/**
 * What "Save as test case" does for the run on screen: the run to save, "already" when it is
 * a case, or null when it is not one of the agent's stored runs (nothing to save yet).
 */
export function runToSave(
  runs: readonly CandidateRun[],
  conversationId: string | null,
  alreadyCases: ReadonlySet<string>,
): CandidateRun | "already" | null {
  if (!conversationId) return null;
  if (alreadyCases.has(conversationId)) return "already";
  return runs.find((r) => r.conversationId === conversationId) ?? null;
}

/** Who can revise an agent (the picker's filter): its owner, or someone it is shared with to edit. */
export function canEditAgent(agent: { isOwner: boolean | null; accessLevel: string | null }): boolean {
  return agent.isOwner === true || agent.accessLevel === "owner" || agent.accessLevel === "admin" || agent.accessLevel === "editor";
}
