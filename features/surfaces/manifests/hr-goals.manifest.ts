/**
 * Surface manifest — goals (`matrx-user/hr-goals`), `/hr/performance/goals`.
 *
 * The person's own goals and, for a manager, each direct report's goals, in alignment order.
 * Create, change, record progress and archive go through the same doors as the page's dialogs
 * (`hr_goal_save`, `hr_goal_archive`); the door decides who may edit whose goals.
 *
 * Emitter: `SurfaceRuntimeProvider` in `GoalsPage` (features/employee-performance-reviews/standard).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_GOALS_SURFACE = "matrx-user/hr-goals";

export const HR_GOAL_STATUSES = ["on_track", "at_risk", "off_track", "done", "dropped"] as const;

const groups: SurfaceValueGroup[] = [
  { key: "goals", label: "Goals", sortOrder: 100, description: "My goals and my team's." },
];

const GOAL_FIELDS =
  '"title" (required on create), "description", "measure", "target_value" (number or null), "current_value" (number or null), "unit", "start_on" and "due_on" (YYYY-MM-DD or ""), "status" (' +
  HR_GOAL_STATUSES.map((s) => `"${s}"`).join(" | ") +
  '), "parent_goal_id" (a goal_id from my_goals or team_goals that this goal supports, or null)';

export const hrGoalsManifest = hrPageSurface({
  surfaceName: HR_GOALS_SURFACE,
  label: "Goals",
  description: "My goals and my team's goals, aligned, with progress (/hr/performance/goals).",
  urlPattern: "/hr/performance/goals",
  situation:
    "They are on Goals: {my_goal_count|no} goals of their own and {team_member_count|no} direct reports' goals below. You can add goals, change them, record progress or archive them.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by GoalsPage; create_goals / update_goals handlers wired. Live probe owed.",
  intro: `<surface_intro>
Goals of the person and of each of their direct reports. Every goal has a goal_id, an owner (employment_id), status, progress (0-100) and may support another goal (parent_goal_id).
- create_goals adds goals for the person (my_employment_id) or a direct report whose can_edit is true.
- update_goals changes goals by goal_id: any field, current_value to record progress, archived: true to archive.
</surface_intro>`,
  groups,
  values: [
    hrValue("my_employment_id", "My employment", "string", "goals", 10, "The person's own employment id (goals they own are created under it). Absent when they have no active employment here.", {
      typicalCharCount: 36,
    }),
    hrValue(
      "my_goals",
      "My goals",
      "array",
      "goals",
      20,
      "The person's goals: { goal_id, title, description, measure, target_value, current_value, unit, start_on, due_on, status, progress, parent_goal_id }.",
      { typicalCharCount: 1500, inlineUpTo: 3000 },
    ),
    hrValue("my_goal_count", "My goal count", "number", "goals", 25, "How many goals the person has."),
    hrValue(
      "team_goals",
      "My team's goals",
      "array",
      "goals",
      30,
      "Each direct report: { employment_id, name, can_edit, goals: [same shape as my_goals] }.",
      { typicalCharCount: 3000, inlineUpTo: 4500 },
    ),
    hrValue("team_member_count", "Direct reports", "number", "goals", 35, "How many direct reports are listed."),
  ],
  writeTargets: [
    hrTarget(
      "create_goals",
      "Add goals",
      { valueType: "array", mode: "entity", updatesValue: "my_goals", group: "goals", sortOrder: 100 },
      `Add goals. SAVED after the person approves, through the same save as the New goal dialog. Value is a JSON ARRAY of 1-25 objects, each { "employment_id" (my_employment_id, or a direct report's employment_id from team_goals; default my_employment_id), ${GOAL_FIELDS} }. Fields left out are blank; status defaults to "on_track". Refused (nothing saved): a missing title, an unknown employment_id or parent_goal_id, a status not in the list, a number that is not a number.`,
    ),
    hrTarget(
      "update_goals",
      "Change goals",
      { valueType: "array", mode: "entity", updatesValue: "my_goals", group: "goals", sortOrder: 110 },
      `Change existing goals. SAVED after the person approves. Value is a JSON ARRAY of 1-25 objects, each { "goal_id" (from my_goals or team_goals), plus only the fields to change from: ${GOAL_FIELDS}; or "archived": true to archive the goal (goals aligned under it are kept) }. Fields left out keep their value. Refused (nothing saved): an unknown goal_id, an item with nothing to change, a goal this viewer may not edit (the door's words).`,
    ),
  ],
});

export function createHrGoalsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
