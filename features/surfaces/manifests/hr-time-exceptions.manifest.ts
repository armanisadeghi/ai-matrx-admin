/**
 * Surface manifest — the attendance exceptions queue (`matrx-user/hr-time-exceptions`),
 * `/hr/time/exceptions`.
 *
 * Every row was raised by a rule (late, missed punch, short meal, …). The page lists them, most
 * severe and oldest first, and lets the reviewer acknowledge the ones that allow it; other
 * resolutions (correct a punch, pay a premium, excuse) open on the row's own record.
 *
 * Emitter: `SurfaceRuntimeProvider` in `ExceptionsQueue` (features/hr/time/exceptions).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_TIME_EXCEPTIONS_SURFACE = "matrx-user/hr-time-exceptions";

const groups: SurfaceValueGroup[] = [
  { key: "exceptions", label: "Exceptions", sortOrder: 100, description: "The exceptions on this page." },
];

export const hrTimeExceptionsManifest = hrPageSurface({
  surfaceName: HR_TIME_EXCEPTIONS_SURFACE,
  label: "Attendance exceptions",
  description: "The attendance exceptions queue: rule-raised findings, acknowledged or resolved (/hr/time/exceptions).",
  urlPattern: "/hr/time/exceptions",
  situation:
    "They are on the attendance exceptions queue: {exception_total|no} exceptions match{exception_filter.kind| (all kinds)}. You can acknowledge the ones that allow it.",
  intro: `<surface_intro>
The attendance exceptions queue. Every row was raised by a rule, never by a person. exceptions is this page of the list, most severe and oldest first.
- acknowledge_exceptions acknowledges rows whose allowed list includes "acknowledged" (recorded against each row). Other resolutions open from the row's own record.
</surface_intro>`,
  groups,
  values: [
    hrValue("exceptions_load_status", "Load status", "string", "exceptions", 10, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue("exception_total", "Matching", "number", "exceptions", 20, "How many exceptions match (all pages)."),
    hrValue(
      "exception_filter",
      "Filter",
      "object",
      "exceptions",
      30,
      "What the page is narrowed to: { kind, employment_id, day, search, read_only (an employee sees their own, read-only) }.",
      { typicalCharCount: 120 },
    ),
    hrValue(
      "exceptions",
      "Exceptions",
      "array",
      "exceptions",
      40,
      "This page of rows: { id, employee, kind, severity, state, work_date, variance_minutes, detected_at, allowed (resolutions this viewer may record) }.",
      { typicalCharCount: 3000, inlineUpTo: 4000 },
    ),
  ],
  writeTargets: [
    hrTarget(
      "acknowledge_exceptions",
      "Acknowledge exceptions",
      { valueType: "array", mode: "entity", updatesValue: "exceptions", group: "exceptions", sortOrder: 100 },
      "Acknowledge exceptions, exactly like the row menu's Acknowledge. SAVED after the person approves; recorded against each row. Value: a JSON ARRAY of 1-50 ids from exceptions whose allowed list includes \"acknowledged\". Refused (nothing saved): an id not on this page, a row that does not allow acknowledging, a read-only viewer.",
    ),
  ],
});

export function createHrTimeExceptionsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
