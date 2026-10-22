/**
 * Surface manifest — one overtime pre-approval request (`matrx-user/hr-overtime-request`),
 * `/hr/time/overtime/[requestId]`.
 *
 * Who asked, for whom, which days and how many hours, why, its state, what was actually worked,
 * and — for an approver — approve (optionally with a cap on hours) or deny through the same door
 * as the page (`hr_wf_decide`). Denying never withholds pay for hours already worked.
 *
 * Emitter: `SurfaceRuntimeProvider` in `OvertimeRequestPage` (features/hr/time/overtime).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_OVERTIME_REQUEST_SURFACE = "matrx-user/hr-overtime-request";

const groups: SurfaceValueGroup[] = [
  { key: "overtime", label: "Overtime request", sortOrder: 100, description: "The request and its decision." },
];

export const hrOvertimeRequestManifest = hrPageSurface({
  surfaceName: HR_OVERTIME_REQUEST_SURFACE,
  label: "Overtime request",
  description: "One overtime pre-approval request: hours, days, reason, state, decision (/hr/time/overtime/[requestId]).",
  urlPattern: "/hr/time/overtime/[requestId]",
  situation:
    "They are on {overtime_request.employee|an employee}'s overtime request for {overtime_request.requested_hours|some} hours, {overtime_request.covers_from|} to {overtime_request.covers_to|}, state {overtime_request.state|unknown}. They see it as {overtime_viewer|an employee}.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by OvertimeRequestPage; decide_overtime handler wired. Live probe owed.",
  intro: `<surface_intro>
One overtime pre-approval request. overtime_request has who, when, how many hours, why and its state; actual_hours and variance_hours appear once the hours are worked.
- decide_overtime approves (optionally capping the hours) or denies it, for an approver (overtime_viewer "manager") while it is requested. Denying never withholds pay for hours already worked; overtime beyond an approved cap is still paid and flagged.
</surface_intro>`,
  groups,
  values: [
    hrValue("overtime_load_status", "Load status", "string", "overtime", 10, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue(
      "overtime_request",
      "Request",
      "object",
      "overtime",
      20,
      "{ id, employee, requested_by, kind (advance | retroactive | standing), covers_from, covers_to, requested_hours, approved_hours, reason, state (requested | approved | denied | expired | withdrawn | auto_flagged), decided_at, decided_by, actual_hours, variance_hours, unapproved_overtime_flagged, thresholds }.",
      { typicalCharCount: 450 },
    ),
    hrValue("overtime_viewer", "Seen as", "string", "overtime", 30, '"manager" (may decide) or "employee".', { alwaysAvailable: true, typicalCharCount: 8 }),
  ],
  writeTargets: [
    hrTarget(
      "decide_overtime",
      "Approve or deny",
      { valueType: "object", mode: "entity", updatesValue: "overtime_request", group: "overtime", sortOrder: 100 },
      'Approve or deny this request, exactly like the page\'s decision. SAVED after the person approves; kept in the ledger. Value: { "decision": "approve" | "reject", "reason": text, "approved_hours"?: number (approve only; a cap below the requested hours) }. If the request changed since it was read, nothing is recorded and the difference is returned. Refused: a viewer who may not decide, a request no longer waiting, a cap that is not a positive number.',
    ),
  ],
});

export function createHrOvertimeRequestScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
