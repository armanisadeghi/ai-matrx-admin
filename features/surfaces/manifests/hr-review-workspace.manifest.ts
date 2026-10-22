/**
 * Surface manifest — one standard performance review (`matrx-user/hr-review-workspace`),
 * `/hr/performance/reviews/[reviewId]`.
 *
 * The role-aware review page: the employee's self form, the manager's form, a peer's form, the
 * comparison once both halves are in, the overall rating, share, acknowledgment, reopen and
 * cancel. What each person may do and read comes from the door (`review.can`); a half this
 * viewer may not read carries no answers.
 *
 * Emitter: `SurfaceRuntimeProvider` in `ReviewWorkspace`; the answer form on screen
 * (`AnswerForm`) contributes `answers_in_progress` and registers `review_answers`.
 * NOT writable on purpose: submit, share, acknowledge, reopen, cancel and change manager — each
 * is the person's own signed act on the review, pressed by them.
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_REVIEW_WORKSPACE_SURFACE = "matrx-user/hr-review-workspace";

const groups: SurfaceValueGroup[] = [
  { key: "review", label: "Review", sortOrder: 100, description: "The review, its template and the answers this viewer may read." },
  { key: "my_form", label: "My form", sortOrder: 200, description: "The answer form on screen." },
];

export const hrReviewWorkspaceManifest = hrPageSurface({
  surfaceName: HR_REVIEW_WORKSPACE_SURFACE,
  label: "Performance review",
  description: "One standard performance review: forms, comparison, overall rating, share and acknowledgment (/hr/performance/reviews/[reviewId]).",
  urlPattern: "/hr/performance/reviews/[reviewId]",
  situation:
    "They are on {review.employee_name|an employee}'s performance review in the {review.cycle_name|current} cycle, status {review.status|not loaded yet}; their next step: {review.next_step|none}. You can fill in their answer form or set the overall rating when they may.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by ReviewWorkspace + AnswerForm; review_answers and overall_rating handlers wired. Live probe owed.",
  intro: `<surface_intro>
One performance review. review says whose it is, its status and what this viewer may do (can). review_questions is the template: every question key, its type and, for ratings, the items and the scale (rating_points).
- review_answers fills the answer form on screen (the self, manager or peer form, answers_in_progress.role); it autosaves like typing and is NOT submitted — the person presses Submit.
- overall_rating sets the manager's overall rating (when can.set_overall).
- Submitting, sharing, acknowledging, reopening and canceling are the person's own acts: say what pressing the button does; never claim it is done.
</surface_intro>`,
  groups,
  values: [
    hrValue("review_load_status", "Load status", "string", "review", 10, '"loading", "loaded", "failed" or "not_reachable" (this viewer has no seat on the review).', {
      alwaysAvailable: true,
      typicalCharCount: 8,
    }),
    hrValue(
      "review",
      "Review",
      "object",
      "review",
      20,
      "{ id, employee_name, manager_name, cycle_name, cycle_status, period_start, period_end, self_due_on, manager_due_on, share_due_on, status, next_step, overall_rating (its label), self_submitted_at, manager_submitted_at, shared_at, acknowledged_at, acknowledgment_comment, cancelled_at, reopen_history: [{ at, reason }], can: { save_self, submit_self, save_manager, submit_manager, set_overall, share, acknowledge, reopen, cancel, replace_manager } }.",
      { typicalCharCount: 900, inlineUpTo: 2000 },
    ),
    hrValue(
      "review_questions",
      "Questions",
      "object",
      "review",
      30,
      "The review template: { name, rating_points: [{ key, value, label }], sections: [{ key, title, questions: [{ key, type, label, required, min_items, max_items, items: [{ key, label }] }] }] }.",
      { typicalCharCount: 2500, inlineUpTo: 3000 },
    ),
    hrValue(
      "readable_answers",
      "Answers I may read",
      "array",
      "review",
      40,
      "The submitted answers this viewer may read: [{ role (self | manager | peer), by (whose), answers: { lists: { <question>: [items] }, ratings: { <question>.<item>: number }, texts: { <question>: text } } }]. Empty until a half is submitted and readable.",
      { typicalCharCount: 2500, inlineUpTo: 2800 },
    ),
    hrValue(
      "answers_in_progress",
      "My form as edited",
      "object",
      "my_form",
      100,
      "The answer form on screen, as typed (autosaved): { role (self | manager | peer), answers: { lists, ratings, texts }, save_state (idle | saving | saved | error), can_submit }. Absent when no form is open for this viewer.",
      { typicalCharCount: 1500 },
    ),
  ],
  writeTargets: [
    hrTarget(
      "review_answers",
      "Fill my answers",
      { valueType: "object", mode: "draft", updatesValue: "answers_in_progress", group: "my_form", sortOrder: 100 },
      'Fill the answer form on screen, merged onto what is there. It AUTOSAVES like typing; it is NOT submitted. Value: { "lists"?: { <question key>: [text, …] } (a whole list replaces that question\'s list; respect max_items), "ratings"?: { "<question key>.<item key>": a rating_points value }, "texts"?: { <question key>: text } }. Keys come from review_questions. Refused (nothing changes): no form open, an unknown question or item, a rating not on the scale, a list longer than its max_items.',
    ),
    hrTarget(
      "overall_rating",
      "Set the overall rating",
      { valueType: "string", mode: "entity", updatesValue: "review", group: "review", sortOrder: 110 },
      "Set the manager's overall rating, exactly like the Overall rating menu. SAVED after the person approves. Value: a rating_points key or its label. Refused: a viewer who may not set it (review.can.set_overall false), a key not on the scale.",
    ),
  ],
});

export function createHrReviewWorkspaceScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
