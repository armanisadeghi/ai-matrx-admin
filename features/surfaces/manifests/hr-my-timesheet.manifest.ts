/**
 * Surface manifest — My timesheet (`matrx-user/hr-my-timesheet`), `/hr/me/timesheet`.
 *
 * The person's own timesheet for one pay period (`hr_timesheet`): hours per day as the payroll
 * engine computed them, period totals, whether they have attested, any disagreement on file,
 * and flagged exceptions.
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/time/timesheet/MyTimesheet.tsx`.
 * Read-only on purpose: attesting is the employee's own signed statement and punch
 * corrections go through a manager; an agent does neither. (The page's assist strip uses the
 * shared `matrx-user/hr-time` key; this surface is the page's own record.)
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { Timesheet } from "@/features/hr/time/api/types";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_MY_TIMESHEET_SURFACE_NAME = "matrx-user/hr-my-timesheet";

const groups: SurfaceValueGroup[] = [
  { key: "timesheet", label: "My timesheet", sortOrder: 100, description: "Own hours for one pay period." },
];

const values = [
  hrValue("timesheet_status", "Load status", "string", "timesheet", 10,
    '"loading", "loaded", "failed" or "no_timesheet" (the page says why there is none).',
    { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("timesheet_period", "Pay period", "object", "timesheet", 20,
    "{ id, pay_group, starts_on, ends_on, pay_date, state }.", { typicalCharCount: 160 }),
  hrValue("timesheet_period_dates", "Period dates", "string", "timesheet", 25,
    'The pay period in words, e.g. "2026-10-01 to 2026-10-14".'),
  hrValue("timesheet_state", "Timesheet state", "string", "timesheet", 30,
    "Where this person's timesheet is for the period (open, submitted, approved …)."),
  hrValue("timesheet_totals", "Period totals", "object", "timesheet", 40,
    "The engine's totals in hours: { total_hours, by_category, overtime, doubletime, not_computed_yet }.",
    { typicalCharCount: 200 }),
  hrValue("timesheet_days", "Days", "array", "timesheet", 50,
    "One row per day with time: { date, total_hours, by_category, punches, exceptions }.",
    { typicalCharCount: 1500, autoContext: false }),
  hrValue("timesheet_attestation", "Attestation", "object", "timesheet", 60,
    "{ can_attest, attested_at, statement }: whether they have signed off on this period.", { typicalCharCount: 200 }),
  hrValue("timesheet_dispute", "Disagreement on file", "object", "timesheet", 70,
    "Present when they disagreed with the hours: { disputed_at, note, resolution, resolved_at, resolved_by }.",
    { typicalCharCount: 300 }),
  hrValue("timesheet_open_exceptions", "Flagged", "array", "timesheet", 80,
    "Exceptions flagged on this period: { kind, severity, state, date, variance_minutes }.", { typicalCharCount: 400 }),
  hrValue("timesheet_note", "Which period and why", "string", "timesheet", 90,
    "The server's sentence when the period shown is not today's, or about the punch link that opened the page.",
    { typicalCharCount: 160, inlineUpTo: 1000 }),
  hrValue("timesheet_no_timesheet_reason", "Why there is no timesheet", "string", "timesheet", 100,
    "The server's sentence when this person has no timesheet for the period.", { typicalCharCount: 160, inlineUpTo: 1000 }),
  hrValue("timesheet_recomputed", "Changed since approval", "object", "timesheet", 110,
    "Present when the hours were recomputed after approval: { at, by, prior_total_hours, current_total_hours }."),
];

export const hrMyTimesheetManifest: SurfaceManifest = {
  surfaceName: HR_MY_TIMESHEET_SURFACE_NAME,
  situation:
    "They are on their own timesheet for {timesheet_period_dates|the pay period shown} (timesheet: {timesheet_status}): their hours as the payroll engine computed them. It is read-only for you; only they can attest.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The person's own timesheet for one pay period (/hr/me/timesheet).",
  label: "HR My timesheet",
  urlPattern: "/hr/me/timesheet",
  intro: `<surface_intro>
The person's own timesheet. Every hour figure is the payroll engine's; quote it, never recompute it.
You cannot attest or change punches; explain what is shown and where to go (a disagreement or a missed punch goes to their manager through HR tasks).
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

export function buildHrMyTimesheetScope(input: {
  status: HrLoadStatus;
  timesheet: Timesheet | null;
  note: string | null;
}): SurfaceScopePayload {
  const t = input.timesheet;
  if (t?.noTimesheetReason) {
    return compact({
      timesheet_status: "no_timesheet",
      timesheet_no_timesheet_reason: t.noTimesheetReason,
      timesheet_note: input.note,
    }) as SurfaceScopePayload;
  }
  return compact({
    timesheet_status: input.status,
    timesheet_period: t
      ? compact({
          id: t.payPeriod.id,
          pay_group: t.payPeriod.payGroupName,
          starts_on: t.payPeriod.periodStartOn,
          ends_on: t.payPeriod.periodEndOn,
          pay_date: t.payPeriod.payDate,
          state: t.payPeriod.state,
        })
      : null,
    timesheet_period_dates: t ? `${t.payPeriod.periodStartOn} to ${t.payPeriod.periodEndOn}` : null,
    timesheet_state: t?.rowState ?? null,
    timesheet_totals: t
      ? compact({
          total_hours: t.periodTotals.totalHours,
          by_category: t.periodTotals.hoursByCategory,
          overtime: t.periodTotals.hoursOvertime,
          doubletime: t.periodTotals.hoursDoubletime,
          not_computed_yet: t.periodTotals.notComputedYet ?? null,
        })
      : null,
    timesheet_days: t
      ? t.weeks
          .flatMap((w) => w.days)
          .filter((d) => d.totalHours > 0 || d.punches.length > 0 || d.exceptions.length > 0)
          .map((d) => ({
            date: d.localWorkDate,
            total_hours: d.totalHours,
            by_category: d.hoursByCategory,
            punches: d.punches.length,
            exceptions: d.exceptions.length,
          }))
      : null,
    timesheet_attestation: t
      ? compact({
          can_attest: t.attestation.canAttest,
          attested_at: t.attestation.attestedAt,
          statement: t.attestation.statementShown ?? t.attestation.statementToShow,
        })
      : null,
    timesheet_dispute: t?.dispute
      ? compact({
          disputed_at: t.dispute.disputedAt,
          note: t.dispute.disputeNote,
          resolution: t.dispute.disputeResolution,
          resolved_at: t.dispute.disputeResolvedAt,
          resolved_by: t.dispute.disputeResolvedByName,
        })
      : null,
    timesheet_open_exceptions: t?.openExceptions.length
      ? t.openExceptions.map((e) =>
          compact({
            kind: e.exceptionKind,
            severity: e.severity,
            state: e.resolutionState,
            date: e.localWorkDate,
            variance_minutes: e.varianceMinutes,
          }),
        )
      : null,
    timesheet_note: input.note,
    timesheet_recomputed: t?.recomputedSinceApproval
      ? compact({
          at: t.recomputedSinceApproval.at,
          by: t.recomputedSinceApproval.byName,
          prior_total_hours: t.recomputedSinceApproval.priorTotalHours,
          current_total_hours: t.recomputedSinceApproval.currentTotalHours,
        })
      : null,
  }) as SurfaceScopePayload;
}
