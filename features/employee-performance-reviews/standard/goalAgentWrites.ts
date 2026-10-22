// The goals page's agent writes (surface `matrx-user/hr-goals`): the values an agent sends,
// checked and turned into the same `GoalInput` the New / Edit goal dialogs save. Pure: every
// refusal is thrown as the sentence the agent reads, before the person is asked.

import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { HR_GOAL_STATUSES } from "@/features/surfaces/manifests/hr-goals.manifest";

import type { Goal } from "./goals";
import type { GoalInput } from "./service";

const TEXT = ["title", "description", "measure", "unit", "start_on", "due_on"] as const;
const NUM = ["target_value", "current_value"] as const;
const ALL = new Set<string>([...TEXT, ...NUM, "status", "parent_goal_id", "employment_id", "goal_id", "archived"]);

function items(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 25) refuseSurfaceWrite("Send a JSON array of 1-25 goals.");
  return (value as unknown[]).map((v, i) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) refuseSurfaceWrite(`Item ${i + 1} is not an object.`);
    const o = v as Record<string, unknown>;
    const unknown = Object.keys(o).filter((k) => !ALL.has(k));
    if (unknown.length) refuseSurfaceWrite(`Item ${i + 1}: unknown field ${unknown.join(", ")}.`);
    return o;
  });
}

const numText = (v: number | null) => (v === null ? "" : String(v));

function apply(base: GoalInput, o: Record<string, unknown>, i: number, knownGoalIds: Set<string>): { input: GoalInput; changed: string[] } {
  const next = { ...base };
  const changed: string[] = [];
  const map: Record<(typeof TEXT)[number], keyof GoalInput> = {
    title: "title",
    description: "description",
    measure: "measure",
    unit: "unit",
    start_on: "startOn",
    due_on: "dueOn",
  };
  for (const k of TEXT) {
    if (o[k] === undefined) continue;
    const v = o[k] === null ? "" : o[k];
    if (typeof v !== "string") refuseSurfaceWrite(`Item ${i + 1}: ${k} must be text.`);
    if ((k === "start_on" || k === "due_on") && v !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(v as string))
      refuseSurfaceWrite(`Item ${i + 1}: ${k} must be YYYY-MM-DD.`);
    (next as unknown as Record<string, string>)[map[k]] = v as string;
    changed.push(k);
  }
  for (const k of NUM) {
    if (o[k] === undefined) continue;
    if (o[k] !== null && (typeof o[k] !== "number" || !Number.isFinite(o[k]))) refuseSurfaceWrite(`Item ${i + 1}: ${k} must be a number or null.`);
    next[k === "target_value" ? "targetValue" : "currentValue"] = o[k] === null ? "" : String(o[k]);
    changed.push(k);
  }
  if (o.status !== undefined) {
    if (!HR_GOAL_STATUSES.includes(o.status as (typeof HR_GOAL_STATUSES)[number]))
      refuseSurfaceWrite(`Item ${i + 1}: status must be one of ${HR_GOAL_STATUSES.join(", ")}.`);
    next.status = o.status as string;
    changed.push("status");
  }
  if (o.parent_goal_id !== undefined) {
    if (o.parent_goal_id !== null && (typeof o.parent_goal_id !== "string" || !knownGoalIds.has(o.parent_goal_id)))
      refuseSurfaceWrite(`Item ${i + 1}: parent_goal_id must be a goal_id on this page, or null.`);
    next.parentGoalId = (o.parent_goal_id as string | null) ?? null;
    changed.push("parent_goal_id");
  }
  if (!next.title.trim()) refuseSurfaceWrite(`Item ${i + 1}: a goal needs a title.`);
  return { input: next, changed };
}

export function goalToInput(g: Goal): GoalInput {
  return {
    goalId: g.goalId,
    employmentId: g.employmentId,
    title: g.title,
    description: g.description ?? "",
    measure: g.measure ?? "",
    targetValue: numText(g.targetValue),
    currentValue: numText(g.currentValue),
    unit: g.unit ?? "",
    startOn: g.startOn ?? "",
    dueOn: g.dueOn ?? "",
    status: g.status,
    parentGoalId: g.parentGoalId,
  };
}

export function parseCreateGoals(value: unknown, me: string | null, editableOwners: Set<string>, all: Goal[]): GoalInput[] {
  const known = new Set(all.map((g) => g.goalId));
  return items(value).map((o, i) => {
    if (o.goal_id !== undefined) refuseSurfaceWrite(`Item ${i + 1}: has a goal_id — use update_goals to change a goal.`);
    if (o.archived !== undefined) refuseSurfaceWrite(`Item ${i + 1}: archived is only for update_goals.`);
    const owner = o.employment_id === undefined ? me : o.employment_id;
    if (typeof owner !== "string" || !editableOwners.has(owner)) refuseSurfaceWrite(`Item ${i + 1}: employment_id must be my_employment_id or an editable direct report's.`);
    const base: GoalInput = {
      goalId: null,
      employmentId: owner as string,
      title: "",
      description: "",
      measure: "",
      targetValue: "",
      currentValue: "",
      unit: "",
      startOn: "",
      dueOn: "",
      status: "on_track",
      parentGoalId: null,
    };
    return apply(base, o, i, known).input;
  });
}

export type GoalUpdatePlan = { goalId: string; title: string; archive: boolean; input: GoalInput | null; changed: string[] };

export function parseUpdateGoals(value: unknown, all: Goal[]): GoalUpdatePlan[] {
  const byId = new Map(all.map((g) => [g.goalId, g]));
  const known = new Set(byId.keys());
  const seen = new Set<string>();
  return items(value).map((o, i) => {
    const g = typeof o.goal_id === "string" ? byId.get(o.goal_id) : undefined;
    if (!g) refuseSurfaceWrite(`Item ${i + 1}: goal_id must be a goal_id from my_goals or team_goals.`);
    if (seen.has(g!.goalId)) refuseSurfaceWrite(`Item ${i + 1}: goal ${g!.title} is named twice.`);
    seen.add(g!.goalId);
    if (o.employment_id !== undefined) refuseSurfaceWrite(`Item ${i + 1}: a goal's owner cannot be changed.`);
    if (o.archived !== undefined && o.archived !== true) refuseSurfaceWrite(`Item ${i + 1}: archived only takes true.`);
    const fields = Object.keys(o).filter((k) => k !== "goal_id" && k !== "archived");
    const { input, changed } = fields.length ? apply(goalToInput(g!), o, i, known) : { input: null, changed: [] as string[] };
    if (!changed.length && o.archived !== true) refuseSurfaceWrite(`Item ${i + 1}: nothing to change.`);
    return { goalId: g!.goalId, title: g!.title, archive: o.archived === true, input, changed };
  });
}
