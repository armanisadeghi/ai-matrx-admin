/**
 * Surface manifest — the punch register (`matrx-user/hr-punch-register`), `/hr/time/punches`.
 *
 * Every punch for one person or the whole employer, voided ones included (a hidden void is a
 * destroyed record), with who recorded it, from where and when.
 *
 * Emitter: `SurfaceRuntimeProvider` in `PunchRegister` (features/hr/time/punches).
 * NO write targets, on purpose: correcting, adding or voiding a punch changes a legal timekeeping
 * record and is made through the correction dialog, with its reason, by the person's own press.
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrValue } from "./hr-surface-kit";

export const HR_PUNCH_REGISTER_SURFACE = "matrx-user/hr-punch-register";

const groups: SurfaceValueGroup[] = [
  { key: "punches", label: "Punches", sortOrder: 100, description: "The punches on this page." },
];

export const hrPunchRegisterManifest = hrPageSurface({
  surfaceName: HR_PUNCH_REGISTER_SURFACE,
  label: "Punch register",
  description: "Every punch for a person or the employer, voided ones included (/hr/time/punches).",
  urlPattern: "/hr/time/punches",
  situation:
    "They are on the punch register for {punch_scope.who|the employer}: {punch_total|no} punches. Corrections are made through the page's correction dialog.",
  readinessNote: "W2 hr-b 2026-10-22: values emitted by PunchRegister; read-only by design. Live probe owed.",
  intro: `<surface_intro>
The punch register: every punch recorded, voided ones included, each with who recorded it (actor) and how (source). punches is this page, newest first. Correcting, adding or voiding a punch is done in the correction dialog with a reason, by the person; explain it, never claim it is done.
</surface_intro>`,
  groups,
  values: [
    hrValue("punches_load_status", "Load status", "string", "punches", 10, '"loading", "loaded" or "failed" (the page shows the reason).', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue("punch_scope", "Whose punches", "object", "punches", 20, "{ who (\"one person\" | \"the employer\"), employment_id, can_edit }.", { typicalCharCount: 80 }),
    hrValue("punch_total", "Punches", "number", "punches", 30, "How many punches match (all pages)."),
    hrValue(
      "punches",
      "Punches",
      "array",
      "punches",
      40,
      "This page: { id, employee, kind, occurred_at, work_date, source, recorded_by (actor type), voided_at, has_geo }.",
      { typicalCharCount: 3500, inlineUpTo: 4000 },
    ),
  ],
});

export function createHrPunchRegisterScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
