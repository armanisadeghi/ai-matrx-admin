/**
 * Surface manifest — the shared desk clock (`matrx-user/hr-desk-clock`), `/hr/time/clock`.
 *
 * A manager or front desk records punches for the person they choose, under their own login;
 * every punch is stamped as entered by the operator. The page shows the chosen person and their
 * clock state.
 *
 * Emitter: `SurfaceRuntimeProvider` in `DeskClockSurface`; the clock state comes from
 * `PunchWidget` (scope contribution). NO write targets, on purpose: a punch is a timekeeping
 * record stamped with the operator's name, made by the operator's own press.
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrValue } from "./hr-surface-kit";

export const HR_DESK_CLOCK_SURFACE = "matrx-user/hr-desk-clock";

const groups: SurfaceValueGroup[] = [
  { key: "clock", label: "Clock", sortOrder: 100, description: "The person chosen and their clock." },
];

export const hrDeskClockManifest = hrPageSurface({
  surfaceName: HR_DESK_CLOCK_SURFACE,
  label: "Shared time clock",
  description: "The shared desk clock: punches entered by an operator for the person they choose (/hr/time/clock).",
  urlPattern: "/hr/time/clock",
  situation:
    "They are at the shared time clock, recording punches for {clock_subject.name|nobody chosen yet} ({clock_status.state|no clock open}). Every punch is stamped as entered by them.",
  intro: `<surface_intro>
The shared desk clock. The operator searches for a person (clock_subject) and punches in, out or to a break for them; clock_status is that person's clock right now. Punches are made by the operator's own press; explain what a button does, never claim a punch was made.
</surface_intro>`,
  groups,
  values: [
    hrValue("clock_subject", "Person chosen", "object", "clock", 10, "The person punches are recorded for: { employment_id, name, employee_number }. Absent until someone is chosen.", {
      typicalCharCount: 100,
    }),
    hrValue(
      "clock_status",
      "Clock",
      "object",
      "clock",
      20,
      "That person's clock: { state (loading | ready | blocked | offline | error | attesting), phase (clocked_out | clocked_in | on_paid_break | on_unpaid_break | on_meal), headline (the page's words), local_work_date, minutes_worked_today, blocked_reason }.",
      { typicalCharCount: 200 },
    ),
  ],
});

export function createHrDeskClockScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
