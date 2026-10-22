/**
 * Surface manifest — one performance review cycle (`matrx-user/hr-review-cycle`),
 * `/hr/performance/cycles/[cycleId]`.
 *
 * The cycle's dates and status, every review in it with who it is still waiting on, adding
 * people (a manager's team, a department, or named people) and closing the cycle.
 *
 * Emitter: `SurfaceRuntimeProvider` in `CyclePage`; `LaunchPanel` contributes the departments
 * and registers `start_reviews` (it owns the "Add people" form and the structure read).
 * NOT writable: calibration ratings (the Calibration tab's own controls, unchanged here).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_REVIEW_CYCLE_SURFACE = "matrx-user/hr-review-cycle";

const groups: SurfaceValueGroup[] = [
  { key: "cycle", label: "Cycle", sortOrder: 100, description: "The cycle and its reviews." },
  { key: "launch", label: "Add people", sortOrder: 200, description: "Starting reviews for more people." },
];

export const hrReviewCycleManifest = hrPageSurface({
  surfaceName: HR_REVIEW_CYCLE_SURFACE,
  label: "Review cycle",
  description: "One performance review cycle: dates, every review and what it waits on, adding people, closing (/hr/performance/cycles/[cycleId]).",
  urlPattern: "/hr/performance/cycles/[cycleId]",
  situation:
    "They are on the {cycle.name|review} cycle ({cycle.status|status unknown}): {cycle.acknowledged_count|0} of {cycle_review_count|its} reviews acknowledged, view {cycle_view|reviews}.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by CyclePage + LaunchPanel; start_reviews and close_cycle handlers wired. Live probe owed.",
  intro: `<surface_intro>
One performance review cycle. cycle has its dates and status; cycle_reviews lists each review (employee, manager, status, what it still waits on).
- start_reviews adds people to the cycle: a department (from departments), a manager's team, or named people by employment id. The cycle must be open and the viewer HR.
- close_cycle locks every review in the cycle for good: nobody can save, submit, share, acknowledge or reopen afterwards.
</surface_intro>`,
  groups,
  values: [
    hrValue("cycle_load_status", "Load status", "string", "cycle", 10, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue(
      "cycle",
      "Cycle",
      "object",
      "cycle",
      20,
      "{ id, name, status (open | closed), period_start, period_end, self_due_on, manager_due_on, share_due_on, acknowledged_count, read_only (true = this viewer reads, launch/close are HR's) }.",
      { typicalCharCount: 300 },
    ),
    hrValue("cycle_review_count", "Reviews", "number", "cycle", 30, "How many reviews the cycle holds."),
    hrValue(
      "cycle_reviews",
      "Reviews in the cycle",
      "array",
      "cycle",
      40,
      "Every review in the cycle: { review_id, employee, manager, status, overall_rating, waiting_on: [words] } (first 100).",
      { typicalCharCount: 3000, inlineUpTo: 6000 },
    ),
    hrValue("cycle_view", "View", "string", "cycle", 50, '"reviews" or "calibration".', { alwaysAvailable: true, typicalCharCount: 12 }),
    hrValue("departments", "Departments", "array", "launch", 100, "The departments people can be added from: { id, name }.", { typicalCharCount: 600, inlineUpTo: 2000 }),
  ],
  writeTargets: [
    hrTarget(
      "start_reviews",
      "Start reviews",
      { valueType: "object", mode: "entity", updatesValue: "cycle_reviews", group: "launch", sortOrder: 100 },
      'Start reviews in this cycle, exactly like Add people → Start reviews. SAVED after the person approves. Value is ONE of: { "department": id or name from departments } | { "manager_employment_id": uuid } (that manager\'s team) | { "employment_ids": [uuid, …] } (named people). Each person refused is named with the reason (already in the cycle, no manager, …). Refused (nothing saved): a closed cycle, a read-only viewer, an unknown department, an empty list.',
    ),
    hrTarget(
      "close_cycle",
      "Close the cycle",
      { valueType: "boolean", mode: "entity", updatesValue: "cycle", group: "cycle", sortOrder: 110 },
      "Close the cycle, exactly like Close cycle. SAVED after the person approves, and it cannot be undone here: every review in the cycle locks — nobody can save, submit, share, acknowledge or reopen afterwards. Value: true. Refused: a cycle already closed, or a read-only viewer.",
    ),
  ],
});

export function createHrReviewCycleScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
