/**
 * Surface manifest — one 360 review (`matrx-user/hr-review-360`), `/hr/performance/[reviewId]`.
 *
 * The HR manager's view of one 360 review: who it is for, its state, its due date, and the
 * employee's and the manager's halves side by side once each is in. Its only action is
 * "Share with both" (HR, both halves in, not yet shared).
 *
 * Emitter: `SurfaceRuntimeProvider` in `ReviewDetail` (features/employee-performance-reviews/
 * review-360/Review360Pages.tsx); the meeting page (`hr-review-360-meeting`) inherits these
 * values and emits them from `Review360SideBySide`.
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_REVIEW_360_SURFACE = "matrx-user/hr-review-360";

const groups: SurfaceValueGroup[] = [
  { key: "review_360", label: "360 review", sortOrder: 100, description: "The review and both halves." },
];

export const HR_REVIEW_360_VALUES = [
  hrValue("review_360_load_status", "Load status", "string", "review_360", 10, '"loading", "loaded", or "failed" (the page shows the reason).', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  hrValue("review_360", "360 review", "object", "review_360", 20, "The review: { id, employee_name, state (collecting | ready | shared), due_on, shared_at }.", {
    typicalCharCount: 160,
  }),
  hrValue(
    "self_half",
    "Employee's half",
    "object",
    "review_360",
    30,
    "The employee's own half as the page shows it: { submitted_at, sections: { <section>: [items] } }. Null sections while it is not in, or when this viewer may not read it (the page says Waiting).",
    { typicalCharCount: 900, inlineUpTo: 3000 },
  ),
  hrValue(
    "manager_half",
    "Manager's half",
    "object",
    "review_360",
    40,
    "The manager's half, same shape as self_half.",
    { typicalCharCount: 900, inlineUpTo: 3000 },
  ),
];

export const hrReview360Manifest = hrPageSurface({
  surfaceName: HR_REVIEW_360_SURFACE,
  label: "360 review",
  description: "One 360 review: the employee's and the manager's halves side by side (/hr/performance/[reviewId]).",
  urlPattern: "/hr/performance/[reviewId]",
  situation:
    "They are looking at the 360 review of {review_360.employee_name|an employee}, state {review_360.state|not loaded yet}: the employee's half and the manager's half side by side.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by ReviewDetail; share_review_360 handler wired. Live probe owed.",
  intro: `<surface_intro>
One 360 review of one employee. self_half is what the employee wrote about themselves, manager_half what their manager wrote; a half that is not in yet (or that this viewer may not read) is empty and shown as Waiting. Each half lists items per section.
- share_review_360 shares both halves with both people. Only HR may, and only once both halves are in.
</surface_intro>`,
  groups,
  values: HR_REVIEW_360_VALUES,
  writeTargets: [
    hrTarget(
      "share_review_360",
      "Share with both",
      { valueType: "boolean", mode: "entity", updatesValue: "review_360", group: "review_360", sortOrder: 100 },
      "Share both halves with the employee and the manager, exactly like the page's Share with both button. SAVED after the person approves. Value: true. Refused (nothing changes): a half not in yet, a review already shared, or a viewer who is not this review's HR manager.",
    ),
  ],
});

export function createHrReview360Scope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
