"use client";

// /hr/performance/goals — my goals and my team's. A goal can be aligned under any goal on this page.

import { useCallback, useEffect, useState } from "react";
import { Target } from "lucide-react";
import { EmptyState } from "@ai-matrx/design-system/controls";

import { HrPageState } from "@/features/hr/shared/HrStates";
import { useHrContext } from "@/features/hr/shared/useHrContext";

import { GoalsView } from "./GoalsView";
import type { Goal, TeamMember } from "./goals";
import { useReloadOnReviewsChanged } from "./invalidation";
import { archiveGoal, listTeamGoals, saveGoal } from "./service";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { HR_GOALS_SURFACE, createHrGoalsScope } from "@/features/surfaces/manifests/hr-goals.manifest";
import { parseCreateGoals, parseUpdateGoals, type GoalUpdatePlan } from "./goalAgentWrites";
import type { GoalInput } from "./service";

export function GoalsPage() {
  const hr = useHrContext();
  const me = hr.active?.employment_id ?? null;
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [mine, setMine] = useState<Goal[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useReloadOnReviewsChanged(useCallback(() => setTick((t) => t + 1), []));

  useEffect(() => {
    if (!me) return;
    let live = true;
    void listTeamGoals(me).then((r) => {
      if (!live) return;
      if (r.ok) setTeam(r.data);
      else setTeamError(r.message);
    });
    return () => {
      live = false;
    };
  }, [me, tick]);

  const teamGoals = team.flatMap((m) => m.goals);
  const alignable = [...mine, ...teamGoals];

  const goalScope = (g: Goal) => ({
    goal_id: g.goalId,
    title: g.title,
    description: g.description,
    measure: g.measure,
    target_value: g.targetValue,
    current_value: g.currentValue,
    unit: g.unit,
    start_on: g.startOn,
    due_on: g.dueOn,
    status: g.status,
    progress: g.progress,
    parent_goal_id: g.parentGoalId,
  });
  const getScope = () =>
    createHrGoalsScope({
      ...(me ? { my_employment_id: me } : {}),
      my_goals: mine.map(goalScope),
      my_goal_count: mine.length,
      team_goals: team.map((m) => ({ employment_id: m.employmentId, name: m.name, can_edit: m.canEdit, goals: m.goals.map(goalScope) })),
      team_member_count: team.length,
    });
  const reloadAll = () => setTick((t) => t + 1);
  const editableOwners = () => new Set([...(me ? [me] : []), ...team.filter((m) => m.canEdit).map((m) => m.employmentId)]);
  const getWriteHandlers = () =>
    collectionWriteHandlers(
      {
        plural: "goals",
        singular: "goal",
        create: {
          parse: (value) => parseCreateGoals(value, me, editableOwners(), alignable),
          run: async (input: GoalInput) => {
            const r = await saveGoal(input);
            if (!r.ok) throw new Error(r.message);
            reloadAll();
            return { id: r.data.goalId, name: input.title };
          },
          nameOf: (input: GoalInput) => input.title,
        },
        update: {
          parse: (value) => parseUpdateGoals(value, alignable),
          run: async (plan: GoalUpdatePlan) => {
            if (plan.input) {
              const r = await saveGoal(plan.input);
              if (!r.ok) throw new Error(r.message);
            }
            if (plan.archive) {
              const r = await archiveGoal(plan.goalId);
              if (!r.ok) throw new Error(r.message);
            }
            reloadAll();
            return { id: plan.goalId, name: plan.title };
          },
          nameOf: (plan: GoalUpdatePlan) => plan.title,
          changedOf: (plan: GoalUpdatePlan) => [...plan.changed, ...(plan.archive ? ["archived"] : [])],
        },
      },
      refuseSurfaceWrite,
    );

  return (
    <SurfaceRuntimeProvider surfaceName={HR_GOALS_SURFACE} getScope={getScope} getWriteHandlers={getWriteHandlers}>
    <HrPageState operation="Goals" employerScope="one" variant="panel">
      <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
        <div className="mx-3 mt-3 space-y-6">
          {me ? (
            <GoalsView employmentId={me} title="My goals" alignable={teamGoals} onLoaded={setMine} reloadKey={tick} />
          ) : (
            // read-gate-exempt: me comes from the HR context (employment), not a read
            <EmptyState icon={<Target />} title="You have no active employment here" line="Goals belong to an employee" />
          )}
          {teamError ? (
            <p role="alert" className="text-sm text-destructive">
              {teamError}
            </p>
          ) : null}
          {team.map((m) => (
            <GoalsView key={m.employmentId} employmentId={m.employmentId} title={`${m.name}'s goals`} alignable={alignable} reloadKey={tick} />
          ))}
        </div>
      </div>
    </HrPageState>
    </SurfaceRuntimeProvider>
  );
}
