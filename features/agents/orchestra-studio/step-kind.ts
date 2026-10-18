import type { SystemPlanStep } from "./types";

/** What a step needs from the person: an agent, a code step somebody builds, or a person who does it. */
export type StepKind = "agent" | "code" | "person";

export function stepKind(step: Pick<SystemPlanStep, "doer">): StepKind {
  if (step.doer === "code") return "code";
  if (step.doer === "human") return "person";
  return "agent";
}

/**
 * Does this step count toward "N of M have an agent"? An agent step does; so does any step the person
 * put an agent on (a plan saved before steps were typed may hold one on a code or person step).
 */
export function needsAgent(step: Pick<SystemPlanStep, "doer" | "usesAgentId">): boolean {
  return stepKind(step) === "agent" || Boolean(step.usesAgentId);
}
