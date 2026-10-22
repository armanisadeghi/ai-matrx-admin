/**
 * Surface manifest — one person's timesheet for one pay period
 * (`matrx-user/hr-employee-timesheet`), `/hr/time/timesheets/[employmentId]` (`?period=`).
 *
 * The person's weeks and days with hours by category, overtime, attestation, dispute, open
 * exceptions and edit history, and the decision on this one timecard (approve or send back),
 * through the same door as the page's decision bar (`hr_wf_decide`). Deciding one timecard never
 * moves the pay period.
 *
 * Emitter: `SurfaceRuntimeProvider` in `EmploymentPeriodDetail`; `DecisionBar` contributes
 * `timecard_decision` and registers `decide_timecard` (it owns the decision state read).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_EMPLOYEE_TIMESHEET_SURFACE = "matrx-user/hr-employee-timesheet";

const groups: SurfaceValueGroup[] = [
  { key: "timesheet", label: "Timesheet", sortOrder: 100, description: "The person's period." },
  { key: "decision", label: "Decision", sortOrder: 200, description: "This timecard's approval." },
];

export const hrEmployeeTimesheetManifest = hrPageSurface({
  surfaceName: HR_EMPLOYEE_TIMESHEET_SURFACE,
  label: "Employee timesheet",
  description: "One person's timesheet for one pay period, and the decision on it (/hr/time/timesheets/[employmentId]).",
  urlPattern: "/hr/time/timesheets/[employmentId]",
  situation:
    "They are on {timesheet.employee|an employee}'s timesheet for {timesheet.period_start|a pay period} to {timesheet.period_end|}: {timesheet.total_hours|no} hours, state {timesheet.state|unknown}. This timecard can be decided now: {timecard_decision.decidable|no}.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by EmploymentPeriodDetail + DecisionBar; decide_timecard handler wired. Live probe owed.",
  intro: `<surface_intro>
One person's timesheet for one pay period. timesheet has the totals, attestation and dispute; days lists each worked day with its hours. open_exceptions must be resolved before the timecard can be approved.
- decide_timecard approves this timecard or sends it back with a reason. It never moves the pay period.
</surface_intro>`,
  groups,
  values: [
    hrValue("timesheet_load_status", "Load status", "string", "timesheet", 10, '"no_period", "loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue(
      "timesheet",
      "Timesheet",
      "object",
      "timesheet",
      20,
      "{ employment_id, employee, period_id, period_start, period_end, state, total_hours, overtime_hours, doubletime_hours, hours_by_category, attested_at, can_attest, dispute: { disputed_at, note, resolution } | null, edits (count), no_timesheet_reason }.",
      { typicalCharCount: 500, inlineUpTo: 1500 },
    ),
    hrValue("days", "Days", "array", "timesheet", 30, "Each day in the period with time: { date, total_hours, hours_by_category, punches (count) }.", {
      typicalCharCount: 1500,
      inlineUpTo: 3000,
    }),
    hrValue("open_exceptions", "Open exceptions", "array", "timesheet", 40, "Exceptions still open on this timecard: { id, kind, severity, work_date }.", { typicalCharCount: 300 }),
    hrValue(
      "timecard_decision",
      "Decision",
      "object",
      "decision",
      100,
      "{ health (awaiting | stuck | no_flow | done | …), decidable (true only while a live flow awaits a decision), row_state }.",
      { typicalCharCount: 100 },
    ),
  ],
  writeTargets: [
    hrTarget(
      "decide_timecard",
      "Approve or send back",
      { valueType: "object", mode: "entity", updatesValue: "timecard_decision", group: "decision", sortOrder: 100 },
      'Approve this timecard or send it back, exactly like the decision bar. SAVED after the person approves; kept in the ledger. Value: { "decision": "approve" | "reject", "reason"?: text (required, 3+ characters, to send back) }. Refused (nothing recorded): no decision awaiting (timecard_decision.decidable false), a send-back without a reason.',
    ),
  ],
});

export function createHrEmployeeTimesheetScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
