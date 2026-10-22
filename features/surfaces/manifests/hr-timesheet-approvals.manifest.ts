/**
 * Surface manifest — timesheet approvals for one pay period (`matrx-user/hr-timesheet-approvals`),
 * `/hr/time/timesheets` (`?period=`).
 *
 * The period's approval grid: one row per person — hours by category, overtime, open
 * exceptions, disputes, state — decisions first, and the open-exceptions strip above it.
 *
 * Emitter: `SurfaceRuntimeProvider` in `PeriodApprovalGrid` (features/hr/time/timesheet).
 * NO write targets yet: bulk approval goes through the page's Review dialog, which shows each
 * timecard's figures before the approver confirms; one timecard is decided on its own page
 * (`hr-employee-timesheet`, which has the target).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrValue } from "./hr-surface-kit";

export const HR_TIMESHEET_APPROVALS_SURFACE = "matrx-user/hr-timesheet-approvals";

const groups: SurfaceValueGroup[] = [
  { key: "grid", label: "Approval grid", sortOrder: 100, description: "The period and its timecards." },
];

export const hrTimesheetApprovalsManifest = hrPageSurface({
  surfaceName: HR_TIMESHEET_APPROVALS_SURFACE,
  label: "Timesheet approvals",
  description: "One pay period's approval grid: every timecard's hours, overtime, exceptions and state (/hr/time/timesheets).",
  urlPattern: "/hr/time/timesheets",
  situation:
    "They are approving timesheets for the pay period {grid_period.start_on|not chosen yet} to {grid_period.end_on|}: {grid_period.approved|0} of {grid_period.total|the} timecards approved.",
  intro: `<surface_intro>
One pay period's timesheet approval grid. timecards is this page, decisions first (open exceptions, then disputes, then overtime). A timecard with open exceptions cannot be approved until they are resolved. Each opens at /hr/time/timesheets/<employment_id>?period=<period id>.
</surface_intro>`,
  groups,
  values: [
    hrValue("grid_load_status", "Load status", "string", "grid", 10, '"no_period" (none chosen), "loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue("grid_period", "Pay period", "object", "grid", 20, "{ id, start_on, end_on, state, approved, total }.", { typicalCharCount: 120 }),
    hrValue("timecard_total", "Timecards", "number", "grid", 30, "How many timecards match (all pages)."),
    hrValue(
      "timecards",
      "Timecards",
      "array",
      "grid",
      40,
      "This page: { employment_id, employee, department, manager, state, total_hours, overtime_hours, doubletime_hours, open_exceptions, disputed, approvable }.",
      { typicalCharCount: 3500, inlineUpTo: 4000 },
    ),
  ],
});

export function createHrTimesheetApprovalsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
