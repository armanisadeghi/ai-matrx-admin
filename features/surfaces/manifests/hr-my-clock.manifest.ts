/**
 * Surface manifest — My time clock (`matrx-user/hr-my-clock`), `/hr/me/clock`.
 *
 * The person's own clock (`hr_clock_state`): whether they are clocked in or on a break, the
 * punches of the open shift, minutes worked so far, what they can press next, and anything
 * flagged. Values come from the ONE clock read `PunchWidget` owns, reported to the page through
 * its `onClockChange` prop.
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/time/clock/MyClockSurface.tsx`.
 * Read-only on purpose: a punch is the employee's own record of when they worked; an agent
 * never punches for them.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { PunchClockView, PunchConfirmation } from "@/features/hr/time/clock/usePunchClock";
import { compact, hrValue } from "./hr-surface-kit";

export const HR_MY_CLOCK_SURFACE_NAME = "matrx-user/hr-my-clock";

const groups: SurfaceValueGroup[] = [
  { key: "clock", label: "My time clock", sortOrder: 100, description: "Own clock state and today's punches." },
];

const values = [
  hrValue("clock_status", "Clock status", "string", "clock", 10,
    '"loading", "ready", "attesting" (the clock-out questions are open), "blocked" (this person cannot use the clock here), "offline", "error", or "no_job" (no active job here today).',
    { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("clock_phase", "Clocked in?", "string", "clock", 20,
    '"clocked_out", "clocked_in", "on_paid_break" or "on_unpaid_break".', { typicalCharCount: 14 }),
  hrValue("clock_blocked_reason", "Why the clock is blocked", "string", "clock", 30,
    "The server's sentence when the clock cannot be used.", { typicalCharCount: 160, inlineUpTo: 1000 }),
  hrValue("clock_work_date", "Work date", "string", "clock", 40, "The local work date of the open shift."),
  hrValue("clock_time_zone", "Time zone", "string", "clock", 45, "The time zone the clock reads in."),
  hrValue("clock_minutes_worked", "Minutes worked", "number", "clock", 50,
    "Minutes worked in the open shift when the state was read (display only; the payroll engine computes paid hours)."),
  hrValue("clock_break_minutes", "Break minutes", "number", "clock", 55, "Minutes on break in the open shift."),
  hrValue("clock_segment_started_at", "Current stretch began", "string", "clock", 60,
    "When the current work or break stretch began."),
  hrValue("clock_punches", "Punches this shift", "array", "clock", 70,
    "The open shift's punches, in order: { kind, occurred_at, break_paid, source }.", { typicalCharCount: 400 }),
  hrValue("clock_next_actions", "What they can press", "array", "clock", 80,
    "The punch kinds the clock offers right now (clock_in, clock_out, break_start, break_end …).", { typicalCharCount: 80 }),
  hrValue("clock_open_exceptions", "Flagged", "array", "clock", 90,
    "Open attendance exceptions on this person: { kind, severity, state, work_date }.", { typicalCharCount: 300 }),
  hrValue("clock_attestation_required", "Clock-out questions", "boolean", "clock", 100,
    "True when clocking out asks the meal and rest-break questions."),
  hrValue("clock_error", "Error", "string", "clock", 110, "The server's sentence when the last punch failed.",
    { typicalCharCount: 160, inlineUpTo: 1000 }),
  hrValue("clock_last_punch", "Last punch", "string", "clock", 120, "The kind of punch just recorded, when the confirmation is on screen."),
];

export const hrMyClockManifest: SurfaceManifest = {
  surfaceName: HR_MY_CLOCK_SURFACE_NAME,
  situation:
    "They are on their own time clock: {clock_phase|state not read yet}, {clock_minutes_worked|0} minutes worked this shift (clock: {clock_status}). Only they can punch; you can explain what they see.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The person's own time clock: state, punches of the open shift, what they can press (/hr/me/clock).",
  label: "HR My time clock",
  urlPattern: "/hr/me/clock",
  intro: `<surface_intro>
The person's own time clock. Explain their state, punches and flags from these values.
Never punch for them and never say they are clocked in or out unless clock_phase says so. Minutes here are a display; paid hours come from the payroll engine.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

export function buildHrMyClockScope(input: {
  hasJob: boolean;
  view: PunchClockView | null;
  confirmation: PunchConfirmation | null;
}): SurfaceScopePayload {
  if (!input.hasJob) return { clock_status: "no_job" } as SurfaceScopePayload;
  const view = input.view;
  if (!view) return { clock_status: "loading" } as SurfaceScopePayload;
  const state =
    view.kind === "ready" || view.kind === "attesting" || view.kind === "offline" || view.kind === "error"
      ? view.state
      : null;
  return compact({
    clock_status: view.kind,
    clock_phase: state?.phase ?? null,
    clock_blocked_reason: view.kind === "blocked" ? view.blocked.message : null,
    clock_work_date: state?.localWorkDate ?? null,
    clock_time_zone: state?.tz ?? null,
    clock_minutes_worked: state?.elapsedWorkedMinutes ?? null,
    clock_break_minutes: state?.elapsedBreakMinutes ?? null,
    clock_segment_started_at: state?.currentSegmentStartedAt ?? null,
    clock_punches: state
      ? state.openChain.map((p) =>
          compact({ kind: p.punchKind, occurred_at: p.occurredAt, break_paid: p.breakPaid, source: p.source }),
        )
      : null,
    clock_next_actions: state && view.kind === "ready" ? state.allowedKinds : null,
    clock_open_exceptions: state?.openExceptions.length
      ? state.openExceptions.map((e) => ({
          kind: e.exceptionKind,
          severity: e.severity,
          state: e.resolutionState,
          work_date: e.localWorkDate,
        }))
      : null,
    clock_attestation_required: state?.attestationRequiredAtClockOut ?? null,
    clock_error: view.kind === "error" ? view.error.userMessage : null,
    clock_last_punch: input.confirmation?.intent.kind ?? null,
  }) as SurfaceScopePayload;
}
