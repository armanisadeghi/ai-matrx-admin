/**
 * The plain words a person reads when a build stopped, derived from the stored outcome.
 *
 * Mirror of `aidream/services/agent_factory/stop_reasons.py` (PLAIN_STOP_REASON); a build that
 * ended before that module existed still carries developer text in `error` and
 * `pass_decision.reason`. `plainBuildState` turns those into the plain line wherever a build is
 * read for display, and keeps the developer text aside as `error_detail` / `reason_detail`.
 * Parity with the server table is guarded by `__tests__/plain-stop-reason-parity.test.ts`.
 */
import type { FactoryBuildState } from "./types";

const FIRST_RUNS = "Its first 3 real runs are judged instead.";

export const PLAIN_STOP_REASON: Record<string, string> = {
  failed: "Something went wrong while building this agent. Try again, or describe the job a little differently.",
  worker_lost: "The build was interrupted before it finished. Try again and it picks up where it stopped.",
  workflow_sized: "This job has several steps, so it fits a workflow better than a single agent.",
  unproven: `We could not prove this agent works, so it was not kept. You can build it anyway; ${FIRST_RUNS.toLowerCase()}`,
  no_proof_inputs: `There are not enough real examples to test this agent on. You can build it anyway; ${FIRST_RUNS.toLowerCase()}`,
  send_backs_exhausted: "The draft kept falling short of its checks after several fixes. Try again, or describe the job a little differently.",
  judge_not_blind: "The test could not be made fair, because it gave away which answer was which. Try again, or build it anyway.",
  needs_new_kind: "This agent needs a kind of answer that does not exist yet. It can answer in plain text instead.",
  schema_refresh_regressed: "The refreshed answer shape did not do as well as the current one, so nothing was changed.",
  already_current: "Nothing to refresh: this agent's answer shape is already up to date.",
  saved_unproven: `Saved without proof. ${FIRST_RUNS}`,
};

export const PLAIN_UNPROVEN_REASON: Record<string, string> = {
  leak: `The examples were visible while the agent was written, so they cannot prove it works. You can build it anyway; ${FIRST_RUNS.toLowerCase()}`,
  floor: `The examples are too alike to prove this agent works. You can build it anyway; ${FIRST_RUNS.toLowerCase()}`,
};

const FALLBACK = "The build stopped before it finished. Try again.";
const KEPT = new Set(["passed", "saved_unproven"]);

export function plainStopReason(outcome: string | null | undefined, unprovenReason?: string | null): string {
  if (outcome === "unproven" && unprovenReason && PLAIN_UNPROVEN_REASON[unprovenReason]) {
    return PLAIN_UNPROVEN_REASON[unprovenReason];
  }
  return PLAIN_STOP_REASON[outcome ?? ""] ?? FALLBACK;
}

/**
 * A stored build state with the person-facing reason in plain words. A state the server already
 * wrote plainly (`error_detail` present) is returned as is; an older one gets the plain line
 * from its outcome and keeps the developer text as `error_detail`. Never mutates the input.
 */
export function plainBuildState(state: FactoryBuildState | null): FactoryBuildState | null {
  if (!state) return state;
  const outcome = state.outcome;
  if (!outcome || outcome === "passed" || state.error_detail != null) return state;
  const plain = plainStopReason(outcome, state.unproven_reason);
  const next: FactoryBuildState = { ...state, error_detail: state.error ?? "" };
  if (state.error || !KEPT.has(outcome)) next.error = plain;
  const decision = (state as Record<string, unknown>).pass_decision;
  if (decision && typeof decision === "object" && !KEPT.has(outcome)) {
    const d = decision as Record<string, unknown>;
    if (typeof d.reason === "string" && d.reason) {
      (next as Record<string, unknown>).pass_decision = { ...d, reason_detail: d.reason, reason: plain };
    }
  }
  return next;
}
