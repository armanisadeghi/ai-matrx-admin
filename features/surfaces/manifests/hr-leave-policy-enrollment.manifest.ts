/**
 * Surface manifest — who is enrolled in one leave policy
 * (`matrx-user/hr-leave-policy-enrollment`), `/hr/settings/leave-policies/[policyId]/enrollment`.
 *
 * The people on the policy with their balance sentence, and the active people who could be
 * added. Enrolling goes through the same door as the page's Enrol button (`hr.leave_enroll`).
 * There is no un-enrol door on this page, so there is no target for it.
 *
 * Emitter: `SurfaceRuntimeProvider` in `LeaveEnrollmentSurface` (features/hr/leave/policies).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_LEAVE_POLICY_ENROLLMENT_SURFACE = "matrx-user/hr-leave-policy-enrollment";

const groups: SurfaceValueGroup[] = [
  { key: "enrollment", label: "Enrollment", sortOrder: 100, description: "Who is on the policy and who could be." },
];

export const hrLeavePolicyEnrollmentManifest = hrPageSurface({
  surfaceName: HR_LEAVE_POLICY_ENROLLMENT_SURFACE,
  label: "Leave policy enrollment",
  description: "Who is enrolled in one leave policy, and enrolling more people (/hr/settings/leave-policies/[policyId]/enrollment).",
  urlPattern: "/hr/settings/leave-policies/[policyId]/enrollment",
  situation:
    "They are on the enrollment of the {enrollment_policy.name|leave} policy: {enrolled_count|no} people enrolled, {candidate_count|no} active people not on it yet. You can enroll people.",
  intro: `<surface_intro>
Enrollment of one leave policy. enrolled_people are on it (with the balance sentence the page shows); enrollment_candidates are active people with a live employment who are not on it yet.
- enroll_people enrolls candidates by employment_id or name, optionally from a date. People the door skips are named with the reason.
</surface_intro>`,
  groups,
  values: [
    hrValue("enrollment_load_status", "Load status", "string", "enrollment", 10, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue("enrollment_policy", "Policy", "object", "enrollment", 20, "{ id, name, leave_kind, active }.", { typicalCharCount: 120 }),
    hrValue("enrolled_count", "Enrolled", "number", "enrollment", 30, "How many people are on the policy."),
    hrValue(
      "enrolled_people",
      "Enrolled people",
      "array",
      "enrollment",
      40,
      "People on the policy: { employment_id, name, balance (the page's sentence) } (first 100).",
      { typicalCharCount: 2500, inlineUpTo: 4000 },
    ),
    hrValue("candidate_count", "Candidates", "number", "enrollment", 50, "How many active people are not on the policy (of those loaded)."),
    hrValue(
      "enrollment_candidates",
      "People who can be added",
      "array",
      "enrollment",
      60,
      "Active people not on the policy: { employment_id, name, job_title } (first 100; the page loads the first directory page).",
      { typicalCharCount: 2500, inlineUpTo: 4000 },
    ),
    hrValue("can_enroll", "Can enroll", "boolean", "enrollment", 70, "True when this viewer may enroll people.", { typicalCharCount: 4 }),
  ],
  writeTargets: [
    hrTarget(
      "enroll_people",
      "Enroll people",
      { valueType: "object", mode: "entity", updatesValue: "enrolled_people", group: "enrollment", sortOrder: 100 },
      'Enroll people in this policy, exactly like the page\'s Enrol button. SAVED after the person approves. Value: { "people": [employment_id or name from enrollment_candidates, …] (1-100), "effective_from"?: "YYYY-MM-DD" (default: today) }. Returns how many were enrolled and each person skipped with the reason. Refused (nothing saved): a person not in enrollment_candidates, a name that matches two people, a bad date, a viewer who may not enroll.',
    ),
  ],
});

export function createHrLeavePolicyEnrollmentScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
