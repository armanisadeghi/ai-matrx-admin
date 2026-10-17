import type { SystemPlan, SystemPlanStep } from "./types";

/** n of m steps have an agent (built in the Studio or chosen from the person's own). */
export function planProgress(plan: Pick<SystemPlan, "steps">): { built: number; total: number } {
  return { built: plan.steps.filter((s) => s.usesAgentId).length, total: plan.steps.length };
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
