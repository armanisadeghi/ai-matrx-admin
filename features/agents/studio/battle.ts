/**
 * Battle on cases — the Studio's battle runs on the agent's test cases through the ONE eval
 * runner (`POST /agent-tests/runs` with `setups`, CONTRACT §4.1): results land in
 * `agent.test_result`, one per case × setup. No second battle store.
 *
 * A setup is what one column runs:
 * - Live: the agent as saved.
 * - Model: the live agent with `patch.model_id` (the doors that carry a model override).
 * - Version: a saved version (`holder.kind = "agent_version"`, manual door).
 * - Candidate: the live agent with a Debrief proposal applied — `patch.messages` and/or
 *   `patch.model_id` — held only by the run until "Keep" saves it as a new version.
 */

import {
  applyInstructionsProposal,
  type DebriefProposal,
} from "@ai-matrx/chat/agents/debrief/debrief-proposals";
import { VERDICT_META } from "@/features/agent-tests/verdicts";
import type { TestResultView } from "@/features/agent-tests/types";
import type { BattleSetup } from "@/features/agent-tests/service";

export type RunSetupBody = BattleSetup;

/** A Debrief proposal applied to the agent: what the candidate column runs. */
export interface StudioCandidate {
  proposalId: string;
  title: string;
  /** The candidate's instructions (null = unchanged). */
  messages: unknown[] | null;
  /** The candidate's model (null = unchanged). */
  modelId: string | null;
}

export const LIVE_KEY = "live";

export function liveSetup(agentId: string): RunSetupBody {
  return { key: LIVE_KEY, label: "Live", holder: { kind: "agent", id: agentId } };
}

export function candidateSetup(agentId: string, c: StudioCandidate): RunSetupBody {
  const patch: RunSetupBody["patch"] = {};
  if (c.messages) patch.messages = c.messages;
  if (c.modelId) patch.model_id = c.modelId;
  return { key: "candidate", label: "Candidate", holder: { kind: "agent", id: agentId }, patch };
}

export function modelSetup(agentId: string, modelId: string, label: string): RunSetupBody {
  return { key: "model", label, holder: { kind: "agent", id: agentId }, patch: { model_id: modelId } };
}

export function versionSetup(versionId: string, versionNumber: number): RunSetupBody {
  return { key: `v${versionNumber}`, label: `Version ${versionNumber}`, holder: { kind: "agent_version", id: versionId } };
}

/**
 * The candidate a proposal makes from the agent's current messages and model, or the reason it
 * cannot (an instructions proposal whose quoted text is not in the instructions).
 */
export function candidateFromProposal(
  messages: readonly { role?: unknown; content?: unknown }[],
  proposal: DebriefProposal,
): { candidate: StudioCandidate } | { error: string } {
  if (proposal.target === "model") {
    if (!proposal.model) return { error: "The proposal names no model" };
    return { candidate: { proposalId: proposal.id, title: proposal.title, messages: null, modelId: proposal.model } };
  }
  if (proposal.target !== "instructions") {
    // Inputs, tools and output changes are words for the person (and the assistant), not a diff.
    return { error: "Only instruction and model changes can be tried as a candidate" };
  }
  const next = applyInstructionsProposal(messages, proposal);
  if (!next) return { error: "The text it quotes is not in the instructions" };
  return { candidate: { proposalId: proposal.id, title: proposal.title, messages: next, modelId: null } };
}

/**
 * About what the battle will cost, in cents: the measured average per result of this agent's
 * past results (run + judge), × cases × setups. Null when nothing has been measured yet.
 */
export function estimateBattleCents(history: readonly TestResultView[], cases: number, setups: number): number | null {
  const measured = history
    .map((r) => (r.runCostCents ?? 0) + (r.judgeCostCents ?? 0))
    .filter((c) => c > 0);
  if (measured.length === 0 || cases === 0 || setups === 0) return null;
  const avg = measured.reduce((a, b) => a + b, 0) / measured.length;
  return avg * cases * setups;
}

export interface SetupScore {
  key: string;
  pass: number;
  fail: number;
  other: number;
  pending: number;
}

/** Pass / fail per setup, and the winner: the setup with the most passes when every result is in. */
export function battleScore(
  results: readonly TestResultView[],
  setupKeys: readonly string[],
): { scores: SetupScore[]; winner: string | null; settled: boolean } {
  const scores = setupKeys.map<SetupScore>((key) => ({ key, pass: 0, fail: 0, other: 0, pending: 0 }));
  for (const r of results) {
    if (r.door === "parity") continue;
    const s = scores.find((x) => x.key === r.setupKey);
    if (!s) continue;
    if (!r.verdict) s.pending += 1;
    else if (VERDICT_META[r.verdict].counted === "pass") s.pass += 1;
    else if (VERDICT_META[r.verdict].counted === "fail") s.fail += 1;
    else s.other += 1;
  }
  const settled = scores.every((s) => s.pending === 0) && results.length > 0;
  const best = Math.max(...scores.map((s) => s.pass));
  const leaders = scores.filter((s) => s.pass === best);
  return { scores, winner: settled && best > 0 && leaders.length === 1 ? leaders[0].key : null, settled };
}
