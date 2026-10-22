/**
 * Surface manifest — one HR request and its decision (`matrx-user/hr-task-decision`),
 * `/hr/tasks/[instanceId]`.
 *
 * What the request is, whom it is about (when this viewer may be told), what it changes, its
 * state, and — for the person whose step it is — the reason box and approve / reject / return.
 * The door (`hr_wf_decide`) records the decision; it refuses anyone deciding their own request.
 *
 * Emitter: `SurfaceRuntimeProvider` in `HrDecisionPanel` on the page only (the copy embedded in
 * the inbox's window keeps the inbox's surface).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_TASK_DECISION_SURFACE = "matrx-user/hr-task-decision";

const groups: SurfaceValueGroup[] = [
  { key: "request", label: "Request", sortOrder: 100, description: "What is being decided." },
  { key: "decision", label: "Decision", sortOrder: 200, description: "The reason box and who may decide." },
];

export const hrTaskDecisionManifest = hrPageSurface({
  surfaceName: HR_TASK_DECISION_SURFACE,
  label: "HR request",
  description: "One HR request: what it is, what it changes, its state, and the decision (/hr/tasks/[instanceId]).",
  urlPattern: "/hr/tasks/[instanceId]",
  situation:
    "They are looking at the HR request {hr_request.kind|being loaded} about {hr_request.subject|someone not shown to them}, state {hr_request.state|unknown}. They can decide it: {can_decide|no}.",
  intro: `<surface_intro>
One HR request. hr_request says what it is and its state; request_change lists what it changes (from → to) when this viewer may be told, else request_summary.
- decision_reason fills the reason box (kept in the ledger). Nothing is recorded.
- record_decision records approve, reject or return for the step waiting on this person, with the reason in the box (or the one you send). Reject and return need a reason; some steps need one to approve (reason_required_to_approve). A person never decides a request about themselves.
</surface_intro>`,
  groups,
  values: [
    hrValue("request_load_status", "Load status", "string", "request", 10, '"loading", "loaded", "refused" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue(
      "hr_request",
      "Request",
      "object",
      "request",
      20,
      "{ instance_id, kind (what kind of request), subject (whom it is about, or null when withheld), state, state_reason, step (the step on screen), step_state, due_at, restricted }.",
      { typicalCharCount: 300 },
    ),
    hrValue("request_change", "What it changes", "array", "request", 30, "Each field the request changes: { field, label, from, to }. Empty when withheld or not a field change.", {
      typicalCharCount: 300,
    }),
    hrValue("request_summary", "Summary", "string", "request", 40, "The one-line summary the page shows when there is no field-by-field change.", { typicalCharCount: 160 }),
    hrValue("can_decide", "Can decide", "boolean", "decision", 100, "True when a step is waiting on this person and they are not its subject.", { typicalCharCount: 4 }),
    hrValue("reason_required_to_approve", "Reason to approve", "boolean", "decision", 110, "True when this step needs a reason even to approve.", { typicalCharCount: 4 }),
    hrValue("decision_reason", "Reason box", "string", "decision", 120, "The reason box as typed.", { typicalCharCount: 200, inlineUpTo: 2000 }),
  ],
  writeTargets: [
    hrTarget(
      "decision_reason",
      "Write the reason",
      { valueType: "string", mode: "draft", updatesValue: "decision_reason", group: "decision", sortOrder: 100, patchable: true, approvalComparison: "text-replacement" },
      "Fill the reason box with the reason for the decision. NOTHING is recorded — the reason goes with the decision when it is made. Value: the whole reason text.",
    ),
    hrTarget(
      "record_decision",
      "Record the decision",
      { valueType: "object", mode: "entity", updatesValue: "hr_request", group: "decision", sortOrder: 110 },
      'Record the decision on the step waiting on this person, exactly like the page\'s buttons. SAVED after the person approves and kept in the ledger. Value: { "decision": "approve" | "reject" | "return", "reason"?: text (else the reason box is used) }. Refused (nothing recorded): no step waiting on this person, a request about this person, reject or return without a reason of 3+ characters, approve without one when reason_required_to_approve.',
    ),
  ],
});

export function createHrTaskDecisionScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
