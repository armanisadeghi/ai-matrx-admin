"use client";

/**
 * The Studio opened from a System Builder plan step (`?from=system-plan&plan=<note>&step=<n>`):
 * a small back-link to that plan, and — once the Studio's agent exists — the agent written back
 * onto that step (`usesAgentId`) through the plan's own store (`features/agents/system-builder`).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPlan, savePlanChanges } from "@/features/agents/system-builder/plan-store";
import type { StudioState } from "../studio-state";

export function PlanBackLink({ state }: { state: StudioState }) {
  const [title, setTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!state.planId) return;
    let live = true;
    void loadPlan(state.planId)
      .then((plan) => {
        if (live) setTitle(plan?.title ?? null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [state.planId]);
  if (!state.planId) return null;
  return (
    <Link
      href={`/agents/system-builder?plan=${encodeURIComponent(state.planId)}`}
      className="truncate text-xs text-primary hover:underline"
      data-testid="studio-plan-link"
    >
      From plan {title ?? "…"}
      {state.planStep ? `, step ${state.planStep}` : ""}
    </Link>
  );
}

export async function writeAgentToPlanStep(
  planId: string,
  stepNumber: number,
  agentId: string,
  agentName: string | null,
): Promise<void> {
  const plan = await loadPlan(planId);
  if (!plan) throw new Error("That plan could not be opened");
  const step = plan.steps.find((s) => s.n === stepNumber);
  if (!step) throw new Error(`The plan has no step ${stepNumber}`);
  if (step.usesAgentId === agentId) return;
  await savePlanChanges(planId, {
    ...plan,
    steps: plan.steps.map((s) => (s.n === stepNumber ? { ...s, usesAgentId: agentId, usesAgentName: agentName } : s)),
  });
}
