/**
 * The Studio's battle pieces: the candidate (a Debrief proposal applied to the agent) and its
 * setup. Everything else — the other setups, the score, the cost estimate — is the ONE battle
 * implementation in `@/features/agent-tests/battle`, shared with the Agent Battle page.
 */

import {
  applyInstructionsProposal,
  type DebriefProposal,
} from "@ai-matrx/chat/agents/debrief/debrief-proposals";
import type { RunSetupBody } from "@/features/agent-tests/battle";

export {
  LIVE_KEY,
  battleScore,
  estimateBattleCents,
  liveSetup,
  modelSetup,
  versionSetup,
  type RunSetupBody,
  type SetupScore,
} from "@/features/agent-tests/battle";

/** A Debrief proposal applied to the agent: what the candidate column runs. */
export interface StudioCandidate {
  proposalId: string;
  title: string;
  /** The candidate's instructions (null = unchanged). */
  messages: unknown[] | null;
  /** The candidate's model (null = unchanged). */
  modelId: string | null;
}

export function candidateSetup(agentId: string, c: StudioCandidate): RunSetupBody {
  const patch: RunSetupBody["patch"] = {};
  if (c.messages) patch.messages = c.messages;
  if (c.modelId) patch.model_id = c.modelId;
  return { key: "candidate", label: "Candidate", holder: { kind: "agent", id: agentId }, patch };
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
