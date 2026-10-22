/**
 * Surface manifest — HR time-off decisions (`matrx-user/hr-leave-queue`), `/hr/leave`.
 *
 * The approver's queue: time-off requests waiting on a decision, with the leave facts the
 * page shows per row (employee, policy, dates, hours, balance on the start date, the
 * validator's findings, whether a leave case is linked). The rows are workflow steps
 * (`hr_wf_inbox`); every decision goes through `hr_wf_decide`.
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/leave/manager/LeaveQueueSurface.tsx`
 * (scope built by `buildHrLeaveQueueScope` below).
 *
 * Write target: `leave_decision_draft` opens the page's own Approve / Deny / Send back
 * dialog on one request. NOTHING is decided until the person confirms in that dialog
 * (a decision is a signed act of the approver, never the agent's).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { LeaveQueueRow } from "@/features/hr/leave/manager/useLeaveQueue";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_LEAVE_QUEUE_SURFACE_NAME = "matrx-user/hr-leave-queue";

const groups: SurfaceValueGroup[] = [
  { key: "queue", label: "Time-off decisions", sortOrder: 100, description: "Requests waiting on a decision." },
];

const values = [
  hrValue("leave_queue_status", "Load status", "string", "queue", 10,
    '"loading", "loaded", "failed" or "no_access" (the person cannot see this queue).',
    { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("leave_queue_view", "View", "string", "queue", 20,
    'Which lane is open: "mine" (waiting on this person), "team" (waiting on someone who reports to them) or "queue" (every open time-off decision in the organization).',
    { alwaysAvailable: true, typicalCharCount: 6 }),
  hrValue("leave_waiting_count", "Waiting on you", "number", "queue", 30,
    "How many requests are waiting on THIS person's decision (narrowed to one when the page was opened for one request)."),
  hrValue("leave_requests_waiting", "Requests waiting on you", "array", "queue", 40,
    'The requests this person can decide, as shown: { step_id, request_id, employee ("Withheld" when the name is restricted), employer, kind ("Time-off request" or "Wants to cancel approved time off"), policy, starts_on, ends_on, partial_day, requested_hours, balance_on_start_date (the server\'s projected balance on the start date; negative means approving overdraws), findings (the validator\'s sentences, hard ones first), leave_case_linked, due, urgent, bulk_allowed }.',
    { typicalCharCount: 2400 }),
  hrValue("leave_requests_others", "Waiting on others", "array", "queue", 50,
    "In the team and organization views: requests waiting on somebody else's decision, same fields. Not decidable from here.",
    { typicalCharCount: 1600, autoContext: false }),
  hrValue("leave_focus_request_id", "Opened for request", "string", "queue", 60,
    "The request id the page was opened for (?request=). Absent when the whole queue is shown."),
  hrValue("leave_focus_missed", "Request no longer waiting", "boolean", "queue", 65,
    "True when the page was opened for one request that is no longer waiting on a decision (decided, canceled or reassigned)."),
  hrValue("leave_selected_step_ids", "Ticked rows", "array", "queue", 70,
    "The step ids of rows the person has ticked for a bulk decision.", { typicalCharCount: 120 }),
  hrValue("leave_partially_loaded", "Some facts withheld", "boolean", "queue", 80,
    "True when the leave facts of at least one row could not be read (the page says so)."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "leave_decision_draft",
    label: "Open a decision",
    description:
      'Open the page\'s decision dialog on ONE request for the person to confirm. NOTHING is decided until the person confirms in the dialog. Value: { "step_id": a step_id from leave_requests_waiting, "decision": "approve" | "deny" | "send_back" }. Refused: a step not waiting on this person, an unknown decision.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    group: "queue",
    sortOrder: 100,
  },
];

export const hrLeaveQueueManifest: SurfaceManifest = {
  surfaceName: HR_LEAVE_QUEUE_SURFACE_NAME,
  situation:
    "They are on the time-off decisions page, {leave_queue_view|mine} view, with {leave_waiting_count|no} requests waiting on their decision (page: {leave_queue_status}). You can open the Approve, Deny or Send back dialog on a request; they confirm it.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "HR time-off decisions: requests waiting on the approver, with balances and findings (/hr/leave).",
  label: "HR Time-off decisions",
  urlPattern: "/hr/leave",
  intro: `<surface_intro>
The approver's time-off queue. leave_requests_waiting holds every request they can decide, with the balance on the start date and the validator's findings.
- To help decide, read the findings and the balance; a negative balance_on_start_date means approving overdraws.
- To act, use leave_decision_draft: it opens the dialog and the person confirms. Never claim a request is decided until they do.
- "Withheld" means the employee's name is restricted for this viewer; never guess it.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
  writeTargets,
};

function rowFacts(row: LeaveQueueRow, employerName: (id: string | null | undefined) => string | null) {
  const request = row.request;
  const check = request?.conflictCheck;
  return compact({
    step_id: row.step_id,
    request_id: request?.id ?? null,
    employee: row.subject_withheld ? "Withheld" : (row.subject_label ?? row.title ?? null),
    employer: employerName(row.organization_id),
    kind: row.flow_key === "leave_cancellation" ? "Wants to cancel approved time off" : (row.step_label ?? "Time-off request"),
    policy: request?.policyName ?? null,
    starts_on: request?.startsOn ?? null,
    ends_on: request?.endsOn ?? null,
    partial_day: request?.isPartialDay ?? null,
    requested_hours: request?.requestedHours ?? null,
    balance_on_start_date: check?.projectedBalanceAtStart ?? null,
    findings: check ? [...check.hard, ...check.advisory].map((f) => f.message).filter(Boolean) : null,
    leave_case_linked: request?.leaveCaseLinked ?? null,
    due: row.due_at,
    urgent: row.urgent,
    bulk_allowed: row.allow_bulk_decide ?? null,
  });
}

export function buildHrLeaveQueueScope(input: {
  status: HrLoadStatus;
  view: string;
  waiting: LeaveQueueRow[];
  others: LeaveQueueRow[];
  focusRequestId: string | null;
  focusMissed: boolean;
  selectedStepIds: string[];
  partiallyLoaded: boolean;
  employerName: (id: string | null | undefined) => string | null;
}): SurfaceScopePayload {
  const loaded = input.status === "loaded";
  return compact({
    leave_queue_status: input.status,
    leave_queue_view: input.view,
    leave_waiting_count: loaded ? input.waiting.length : null,
    leave_requests_waiting: loaded ? input.waiting.map((r) => rowFacts(r, input.employerName)) : null,
    leave_requests_others:
      loaded && input.view !== "mine" ? input.others.map((r) => rowFacts(r, input.employerName)) : null,
    leave_focus_request_id: input.focusRequestId,
    leave_focus_missed: input.focusRequestId ? input.focusMissed : null,
    leave_selected_step_ids: input.selectedStepIds.length ? input.selectedStepIds : null,
    leave_partially_loaded: loaded ? input.partiallyLoaded : null,
  }) as SurfaceScopePayload;
}
