/**
 * Surface manifest — one pay period (`matrx-user/hr-pay-period`), `/hr/time/periods/[periodId]`.
 *
 * The period's dates, state and timecard counts, whether each timecard's approval flow is
 * actually running, boundary weeks, payroll exports and post-lock adjustments.
 *
 * Emitter: `SurfaceRuntimeProvider` in `PeriodDetailPage` (features/hr/time/periods).
 * NO write targets, on purpose: submitting, approving, locking, closing, reopening and exporting a
 * pay period are payroll acts with legal and money consequences, made by the person's own press on
 * the period's transition bar.
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrValue } from "./hr-surface-kit";

export const HR_PAY_PERIOD_SURFACE = "matrx-user/hr-pay-period";

const groups: SurfaceValueGroup[] = [
  { key: "period", label: "Pay period", sortOrder: 100, description: "The period, its timecards and their approval flows." },
];

export const hrPayPeriodManifest = hrPageSurface({
  surfaceName: HR_PAY_PERIOD_SURFACE,
  label: "Pay period",
  description: "One pay period: dates, state, timecard counts, approval-flow health, exports (/hr/time/periods/[periodId]).",
  urlPattern: "/hr/time/periods/[periodId]",
  situation:
    "They are on the {pay_period.pay_group|} pay period {pay_period.start_on|} to {pay_period.end_on|}, state {pay_period.state|unknown}: {pay_period.counts.approved|0} of {pay_period.counts.employments|its} timecards approved. They act as {period_role|a viewer}.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by PeriodDetailPage; read-only by design. Live probe owed.",
  intro: `<surface_intro>
One pay period. pay_period has its dates, state and timecard counts; approval_flows says, per timecard, whether anybody was actually asked to decide (awaiting, stuck, no flow, done). Transitions (submit, approve, lock, close, reopen, export) are the person's own presses on the page; explain what each does, never claim one was made.
</surface_intro>`,
  groups,
  values: [
    hrValue("period_load_status", "Load status", "string", "period", 10, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue("period_role", "Acting as", "string", "period", 20, "This viewer's role on the period (payroll_admin, hr_admin, manager, …).", { typicalCharCount: 14 }),
    hrValue(
      "pay_period",
      "Pay period",
      "object",
      "period",
      30,
      "{ id, pay_group, start_on, end_on, pay_date, sequence, state, submitted_at, approved_at, exported_at, locked_at, closed_at, reopened_at, reopen_reason, reopen_allowed, reopen_notice, counts: { employments, approved, open, attested, disputed, … }, recomputed_since_approval, hours_at_approval, hours_now, adjustments_tagged_here, boundary_note }.",
      { typicalCharCount: 700, inlineUpTo: 2000 },
    ),
    hrValue(
      "approval_flows",
      "Approval flows",
      "object",
      "period",
      40,
      "Whether each timecard's approval was asked: { awaiting, stuck, no_flow, unreachable, done, rows: [{ employment_id, employee, state }] (first 100) }.",
      { typicalCharCount: 2500, inlineUpTo: 4000 },
    ),
  ],
});

export function createHrPayPeriodScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
