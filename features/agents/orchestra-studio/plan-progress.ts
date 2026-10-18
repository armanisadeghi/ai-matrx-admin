import type { SystemPlan, SystemPlanStep } from "./types";
import { needsAgent, stepKind } from "./step-kind";

/**
 * n of m AGENT steps have an agent (built in the Studio or chosen from the person's own). Code steps
 * and person steps are not agents: they never count against the total, and never block the Orchestra.
 */
export function planProgress(plan: Pick<SystemPlan, "steps">): { built: number; total: number } {
  const agentSteps = plan.steps.filter(needsAgent);
  return { built: agentSteps.filter((s) => s.usesAgentId).length, total: agentSteps.length };
}

/** How many steps are done by code or by a person (shown beside the progress, never counted in it). */
export function otherSteps(plan: Pick<SystemPlan, "steps">): { code: number; person: number } {
  return {
    code: plan.steps.filter((s) => stepKind(s) === "code" && !s.usesAgentId).length,
    person: plan.steps.filter((s) => stepKind(s) === "person" && !s.usesAgentId).length,
  };
}

export interface PlanMember {
  agentId: string;
  roleTitle: string;
  gap: string;
}

/**
 * The Orchestra's members from a plan: one per distinct agent, in step order. An agent that serves
 * two steps joins once (an Orchestra holds an agent once) and keeps the first step's role.
 */
export function membersFromPlan(plan: Pick<SystemPlan, "steps">): PlanMember[] {
  const seen = new Set<string>();
  const out: PlanMember[] = [];
  for (const s of plan.steps as SystemPlanStep[]) {
    if (!s.usesAgentId || seen.has(s.usesAgentId)) continue;
    seen.add(s.usesAgentId);
    out.push({ agentId: s.usesAgentId, roleTitle: s.title.slice(0, 60), gap: s.summary || s.job });
  }
  return out;
}

export type StepAgentStatus = "ready" | "inactive" | "archived" | "missing";

export function statusLabel(status: StepAgentStatus): string {
  return { ready: "Ready", inactive: "Not active", archived: "Archived", missing: "Not found" }[status];
}

export function statusOf(row: { is_active: boolean; is_archived: boolean; deleted_at: string | null } | undefined): StepAgentStatus {
  if (!row || row.deleted_at) return "missing";
  if (row.is_archived) return "archived";
  return row.is_active ? "ready" : "inactive";
}
