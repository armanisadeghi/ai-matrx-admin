/**
 * Surface manifest — My time off (`matrx-user/hr-my-time-off`), `/hr/me/time-off`.
 *
 * The person's own leave: a balance per policy they are enrolled in, the request form, and
 * every request they have made (`hr.my_time_off`).
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/leave/components/MyTimeOffSurface.tsx`
 * (scope built by `buildHrMyTimeOffScope` below).
 *
 * Write target: `time_off_request_draft` fills the request form (policy, dates, reason, note).
 * NOTHING is submitted — the person previews and presses Submit, because a leave request is the
 * employee's own act. Withdrawing a request stays a person's click on the request list.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { LeaveReasonCategory, MyTimeOff } from "@/features/hr/leave/api/types";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_MY_TIME_OFF_SURFACE_NAME = "matrx-user/hr-my-time-off";

const groups: SurfaceValueGroup[] = [
  { key: "time_off", label: "My time off", sortOrder: 100, description: "Own balances, requests and the request form." },
];

const values = [
  hrValue("time_off_status", "Load status", "string", "time_off", 10,
    '"loading", "loaded", "failed" or "no_access".', { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("time_off_as_of", "As of", "string", "time_off", 20, "The date the balances are read at."),
  hrValue("time_off_balances", "Balances", "array", "time_off", 30,
    "One row per enrolled policy, the server's figures in hours: { policy_id, policy, leave_kind, unlimited, bookable_now (what can be booked right now), ledger_balance, used_taken, approved_upcoming, pending_approval, sentence (the server's words), usable_on, documentation_required_after_days }.",
    { typicalCharCount: 1200 }),
  hrValue("time_off_requests", "My requests", "array", "time_off", 40,
    "Every request this person has made: { id, policy, state (draft | submitted | approved | denied | cancelled | taken …), starts_on, ends_on, requested_hours, approved_hours, partial_day, denial_reason, decided_at }.",
    { typicalCharCount: 1500 }),
  hrValue("time_off_can_request", "Can request", "boolean", "time_off", 50,
    "True when the request form is on the page (only the person themselves can request)."),
  hrValue("time_off_reasons", "Reason choices", "array", "time_off", 60,
    "The reasons a request can carry: { id, name }.", { typicalCharCount: 300, autoContext: false }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "time_off_request_draft",
    label: "Fill the request form",
    description:
      'Fill the time-off request form for the person to preview and submit. NOTHING is submitted. Value: { "policy_id": a policy_id from time_off_balances, "starts_on": "YYYY-MM-DD", "ends_on"?: "YYYY-MM-DD" (defaults to starts_on), "reason_id"?: an id from time_off_reasons, "note"?: string }. The form is replaced by this fill. Refused: a policy the person is not enrolled in, a bad date, ends_on before starts_on, an unknown reason, or no form on the page.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    group: "time_off",
    sortOrder: 100,
  },
];

export const hrMyTimeOffManifest: SurfaceManifest = {
  surfaceName: HR_MY_TIME_OFF_SURFACE_NAME,
  situation:
    "They are on their own time-off page: their balances, their requests and the request form (page: {time_off_status}). You can fill the request form; they preview and submit it.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The person's own leave balances and requests, and the request form (/hr/me/time-off).",
  label: "HR My time off",
  urlPattern: "/hr/me/time-off",
  intro: `<surface_intro>
The person's own time off. Quote balances from time_off_balances (bookable_now is what they can book today); never compute a balance yourself.
To help them ask for time off, use time_off_request_draft; the page previews it and they press Submit. Never say a request was made until it appears in time_off_requests.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
  writeTargets,
};

export function buildHrMyTimeOffScope(input: {
  status: HrLoadStatus;
  data: MyTimeOff | null;
  reasons: LeaveReasonCategory[];
}): SurfaceScopePayload {
  const d = input.data;
  return compact({
    time_off_status: input.status,
    time_off_as_of: d?.asOf ?? null,
    time_off_balances: d
      ? d.policies.map((p) =>
          compact({
            policy_id: p.policyId,
            policy: p.policyName,
            leave_kind: p.leaveKind,
            unlimited: p.unlimited,
            bookable_now: p.bookableNow,
            ledger_balance: p.ledgerBalance,
            used_taken: p.usedTaken,
            approved_upcoming: p.approvedUpcoming,
            pending_approval: p.pendingApproval,
            sentence: p.sentence,
            usable_on: p.usableOn,
            documentation_required_after_days: p.documentationRequiredAfterDays,
          }),
        )
      : null,
    time_off_requests: d
      ? d.requests.map((r) =>
          compact({
            id: r.id,
            policy: r.policyName,
            state: r.state,
            starts_on: r.startsOn,
            ends_on: r.endsOn,
            requested_hours: r.requestedHours,
            approved_hours: r.approvedHours,
            partial_day: r.isPartialDay,
            denial_reason: r.denialReason,
            decided_at: r.decidedAt,
          }),
        )
      : null,
    time_off_can_request: d ? d.canRequest : null,
    time_off_reasons: input.reasons.length ? input.reasons.map((r) => ({ id: r.id, name: r.name })) : null,
  }) as SurfaceScopePayload;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Validates an agent's fill against what the page offers. Throws the refusal sentence. */
export function parseTimeOffRequestDraft(
  value: unknown,
  data: MyTimeOff | null,
  reasons: LeaveReasonCategory[],
  refuse: (message: string) => never,
): { policyId: string; startsOn: string; endsOn: string; reasonCategoryId?: string; note?: string } {
  if (!data) refuse("Time off has not loaded yet.");
  if (!data.canRequest) refuse("There is no request form on this page for this person.");
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const policy = data.policies.find((p) => p.policyId && p.policyId === v.policy_id);
  if (!policy?.policyId) refuse("policy_id must be a policy_id from time_off_balances.");
  const startsOn = typeof v.starts_on === "string" ? v.starts_on : "";
  if (!ISO_DAY.test(startsOn)) refuse('starts_on must be a date like "2026-11-03".');
  const endsOn = v.ends_on === undefined ? startsOn : typeof v.ends_on === "string" ? v.ends_on : "";
  if (!ISO_DAY.test(endsOn)) refuse('ends_on must be a date like "2026-11-05".');
  if (endsOn < startsOn) refuse("ends_on is before starts_on.");
  let reasonCategoryId: string | undefined;
  if (v.reason_id !== undefined) {
    const reason = reasons.find((r) => r.id === v.reason_id);
    if (!reason) refuse("reason_id must be an id from time_off_reasons.");
    reasonCategoryId = reason.id;
  }
  const note = typeof v.note === "string" ? v.note : undefined;
  return { policyId: policy.policyId, startsOn, endsOn, reasonCategoryId, note };
}
