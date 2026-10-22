/**
 * Surface manifest — one leave policy's editor (`matrx-user/hr-leave-policy`),
 * `/hr/settings/leave-policies/[policyId]` (also `…/new`).
 *
 * How the policy earns time, when it can be spent, caps, carryover, negative balance, payout,
 * blackouts and who it covers, checked against the law of every operating jurisdiction.
 *
 * Emitter: `SurfaceRuntimeProvider` in `LeavePolicyEditorSurface` (features/hr/leave/policies).
 * The one write fills the form; saving (draft or active) stays the person's press, because a save
 * can be refused as unlawful and that dialog is theirs to read.
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_LEAVE_POLICY_SURFACE = "matrx-user/hr-leave-policy";

const groups: SurfaceValueGroup[] = [
  { key: "policy", label: "Policy", sortOrder: 100, description: "The policy as saved and as edited." },
  { key: "checks", label: "Checks", sortOrder: 200, description: "What the law check found." },
];

export const hrLeavePolicyManifest = hrPageSurface({
  surfaceName: HR_LEAVE_POLICY_SURFACE,
  label: "Leave policy",
  description: "One leave policy's rules: accrual, waiting periods, caps, carryover, payout, blackouts (/hr/settings/leave-policies/[policyId]).",
  urlPattern: "/hr/settings/leave-policies/[policyId]",
  situation:
    "They are editing the leave policy {leave_policy.name|being created} ({leave_policy.status|new}). Unsaved changes: {has_unsaved_changes|no}. You can fill in the form; they save it.",
  intro: `<surface_intro>
One leave policy's editor. policy_form is the form as it stands (field names as below); leave_policy is what is saved.
- waitingPeriodDays delays EARNING; usableAfterDays delays SPENDING. Never confuse them.
- accrualMethod "unlimited" clears every cap, carryover, negative-balance and payout field on save.
- policy_form fills the form for the person to review; nothing is saved until they press Save. A save can be refused as unlawful in a jurisdiction; policy_checks has what the law check found.
</surface_intro>`,
  groups,
  values: [
    hrValue("policy_load_status", "Load status", "string", "policy", 10, '"loading", "loaded", "failed" or "not_found".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue(
      "leave_policy",
      "Saved policy",
      "object",
      "policy",
      20,
      "The policy as saved: { id, name, leave_kind, status (active | draft | new), version, enrolled_count }. Absent for a new policy.",
      { typicalCharCount: 150 },
    ),
    hrValue(
      "policy_form",
      "Form as edited",
      "object",
      "policy",
      30,
      "The form on screen, including unsaved edits: { name, leaveKind, statutoryBasisRuleClass, accrualMethod, accrualRate, accrualPerUnits, accrualStarts, waitingPeriodDays, usableAfterDays, annualAccrualCap, balanceCap, carryoverAllowed, carryoverCap, carryoverExpiresAfterDays, negativeBalanceAllowed, negativeBalanceFloor, payoutOnTermination, reinstateOnRehireWithinDays, incrementMinutes, documentationRequiredAfterDays, earningCodeId, mandatedUses: [..], blackoutRules: [..], workerClassScope: [..], scheduleClassScope: [..], isActive }. Numbers are text as typed (\"\" = none).",
      { typicalCharCount: 900, inlineUpTo: 3000 },
    ),
    hrValue("visible_fields", "Fields shown", "array", "policy", 40, "The form fields this accrual method shows; the others are hidden and cleared on save.", { typicalCharCount: 400 }),
    hrValue("has_unsaved_changes", "Unsaved changes", "boolean", "policy", 50, "True when the form differs from what is saved.", { typicalCharCount: 4 }),
    hrValue("can_edit_policy", "Can edit", "boolean", "policy", 60, "True when this viewer may save leave policies.", { typicalCharCount: 4 }),
    hrValue("form_problems", "What stops Save", "array", "checks", 100, "Every problem the form has now, in the page's words: { field, message }.", { typicalCharCount: 200 }),
    hrValue(
      "policy_checks",
      "Law check",
      "object",
      "checks",
      110,
      "The last law check of this form: { ok, detail, jurisdictions_checked, violations: [{ field, message, jurisdiction }], warnings: [same] }. Absent until a check has run.",
      { typicalCharCount: 600, inlineUpTo: 2500 },
    ),
  ],
  writeTargets: [
    hrTarget(
      "policy_form",
      "Fill the policy form",
      { valueType: "object", mode: "draft", updatesValue: "policy_form", group: "policy", sortOrder: 100 },
      'Fill the leave policy form for the person to review. NOTHING is saved — they press Save. Value is a JSON object with any of the policy_form fields: text fields take text (numbers as text, "" = none), carryoverAllowed / negativeBalanceAllowed / isActive take true|false, mandatedUses / workerClassScope / scheduleClassScope take lists of texts, blackoutRules takes the list shape policy_form shows. Only the keys you send change. Refused (nothing changes): an unknown field, "id", a value of the wrong type, a viewer who may not edit.',
    ),
  ],
});

export function createHrLeavePolicyScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
