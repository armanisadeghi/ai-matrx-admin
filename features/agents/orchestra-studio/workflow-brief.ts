import type { SystemPlan } from "./types";

/** Does the Architect's recommendation point at a workflow rather than an Orchestra? */
export function planWantsWorkflow(plan: Pick<SystemPlan, "recommendation">): boolean {
  return /\bwork-?flow\b/i.test(plan.recommendation ?? "");
}

/** The plan's steps as the first message for Workflow Studio's Conductor. */
export function workflowBrief(plan: Pick<SystemPlan, "title" | "recommendation" | "steps">): string {
  const lines = plan.steps.map((s) => `${s.n}. ${s.title}${s.summary ? `: ${s.summary}` : ""}`);
  return [`Build this as a workflow: ${plan.title}`, plan.recommendation ?? "", "", "Steps:", ...lines].filter((l, i) => l !== "" || i === 2).join("\n");
}
