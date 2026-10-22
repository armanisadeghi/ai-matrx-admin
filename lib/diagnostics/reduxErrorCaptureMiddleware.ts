/**
 * reduxErrorCaptureMiddleware.ts
 *
 * Captures every RTK rejected thunk (action type ending in /rejected) that
 * represents a real failure into the systemwide Error Inspector. This was the
 * largest remaining gap: a rejected
 * mutation thunk would roll back + toast, but the structured failure (the thunk
 * name, the serialized error, the rejectWithValue payload) was invisible to
 * diagnostics.
 *
 * Scope guards — we do NOT capture non-failures:
 *   - `meta.aborted` (the request was canceled / superseded)
 *   - `meta.condition` (the thunk's `condition` returned false — never ran)
 *   - AbortError / ConditionError by name, and every serialized form of an
 *     abort: DOMException code 20 / `ABORT_ERR`, and the STRINGIFIED shape
 *     supabase-js postgrest builds (`{ code: "", message: "AbortError: …" }`),
 *     which carries no `name` once a thunk rethrows it (`isCancellation`).
 *     A `TimeoutError` (AbortSignal.timeout, or an abort with a TimeoutError
 *     reason) is a real failure and is still captured.
 *   - SessionUnavailableError (an expected auth-lifecycle pause)
 *   - a rejection marked ResumeRetryScheduled (its own retry is already queued)
 *   - a file-metadata READ refused `permission_denied` / `file_not_found`
 *     (`isExpectedFileReadRefusal`) — the same refusal `captureApiError`
 *     already keeps out at the HTTP layer; the slice stores it on the file
 *     for the surface to render (files handler rule 15). Records pointing at
 *     a file their owner cannot read are caught at the data layer by
 *     aidream `scripts/check_file_refs_readable.py --live`, not here.
 *
 * `relation` is the thunk name (the action type minus `/rejected`) so an admin
 * can downgrade a whole slice or a single thunk by `relation` in
 * `errorTierRules.ts`. Defaults to ORANGE (these are typically handled by the
 * slice — rollback / error-state); promote a critical slice to red with a rule.
 *
 * Register once in `lib/redux/store.ts`. Never breaks the dispatch chain.
 */

import { isCapturedSurfaceRegistrationError } from "@ai-matrx/chat/surfaces/services/surface-registration-error";
import type { Middleware } from "@reduxjs/toolkit";
import { captureError, getSnapshot } from "@/lib/diagnostics/errorCaptureStore";
import {
  isPersonCancellationErrorName,
  isHandedOnErrorName,
  type ExecutionRejectionMeta,
} from "./executionRejectionMeta";

interface RejectedAction {
  type: string;
  error?: ExecutionRejectionMeta & {
    name?: string;
    message?: string;
    code?: string;
    stack?: string;
  };
  payload?: unknown;
  meta?: ExecutionRejectionMeta & {
    aborted?: boolean;
    condition?: boolean;
    rejectedWithValue?: boolean;
    requestId?: string;
  };
}

function messageOf(a: RejectedAction): string {
  // Prefer a rejectWithValue payload (string or { message } / { error }).
  if (typeof a.payload === "string" && a.payload.trim())
    return a.payload.trim();
  if (a.payload && typeof a.payload === "object") {
    const p = a.payload as Record<string, unknown>;
    if (typeof p.message === "string" && p.message.trim())
      return p.message.trim();
    if (typeof p.error === "string" && p.error.trim()) return p.error.trim();
  }
  const m = a.error?.message?.trim();
  if (m && m.toLowerCase() !== "rejected") return m;
  return "Rejected thunk";
}

/** `AbortError: …` / `AbortError` — the stringified form postgrest-js and
 * `String(err)` produce. Anchored so "Upload aborted by server" stays a failure. */
const STRINGIFIED_ABORT = /^AbortError(?::|$)/;

function isAbortShape(value: unknown): boolean {
  if (typeof value === "string") return STRINGIFIED_ABORT.test(value.trim());
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.name === "TimeoutError") return false;
  if (v.name === "AbortError") return true;
  if (v.code === 20 || v.code === "20" || v.code === "ABORT_ERR") return true;
  return typeof v.message === "string" && STRINGIFIED_ABORT.test(v.message.trim());
}

/**
 * A rejection that is a cancellation, not a failure: the thunk was aborted
 * (unmount, supersession, the caller's own signal) or never ran. Timeouts are
 * NOT cancellations — a timeout is a failure the person felt.
 */
export function isCancellation(action: RejectedAction): boolean {
  if (action.meta?.aborted || action.meta?.condition) return true;
  if (action.error?.name === "ConditionError") return true;
  return isAbortShape(action.error) || isAbortShape(action.payload);
}

const STREAM_WRAPPER_RELATIONS = new Set([
  "instances/execute",
  "instances/executeManual",
  "instances/smartExecute",
]);

/**
 * runAiStream owns stream-phase capture before its rejection propagates through
 * execute -> smartExecute. Those wrapper actions describe the same dead turn,
 * not two additional incidents. Keep every unrelated AI rejection red.
 */
export function isStreamWrapperDuplicate(
  action: RejectedAction,
  now = Date.now(),
): boolean {
  const relation = action.type.slice(0, -"/rejected".length);
  if (!STREAM_WRAPPER_RELATIONS.has(relation)) return false;
  const message = messageOf(action);
  return getSnapshot().some(
    (captured) =>
      ((captured.source === "agent-stream-client-error" &&
        captured.message === message) ||
        (captured.source === "agent-stream-transport" &&
          (captured.message === message ||
            captured.userMessage === message))) &&
      now - captured.lastAt <= 5_000,
  );
}

/** Read-only file thunks whose typed refusal is a rendered state, not an incident. */
const FILE_READ_RELATIONS = new Set(["cloudFiles/ensureCloudFileFields"]);
const FILE_READ_REFUSAL_CODES = new Set(["permission_denied", "file_not_found"]);

/**
 * Mirrors `captureApiError`'s `expectedFileReadRefusal`: that layer skips the
 * HTTP 403/404, so capturing the thunk that carried it would re-file the same
 * expected refusal as an orange incident (2026-10-22, brand home screenshot).
 * Writes and every other code stay captured.
 */
export function isExpectedFileReadRefusal(action: RejectedAction): boolean {
  const relation = action.type.slice(0, -"/rejected".length);
  if (!FILE_READ_RELATIONS.has(relation)) return false;
  const code = action.error?.code;
  return typeof code === "string" && FILE_READ_REFUSAL_CODES.has(code);
}

export const reduxErrorCaptureMiddleware: Middleware =
  () => (next) => (action) => {
    const result = next(action);
    const a = action as RejectedAction;
    try {
      if (typeof a?.type === "string" && a.type.endsWith("/rejected")) {
        // Not real failures — a superseded or never-run thunk.
        if (isCancellation(a)) return result;
        if (a.error?.name === "SessionUnavailableError") return result;
        // The person's own Stop / picker dismissal is an answer (W-49).
        if (
          isPersonCancellationErrorName(a.meta?.originalErrorName) ||
          isPersonCancellationErrorName(a.error?.originalErrorName)
        ) {
          return result;
        }
        // A rejection that hands the turn on (its own retry is scheduled, or
        // another resume already holds the claim) is control flow; only the
        // final, unrecovered rejection (no marker) is a failure.
        if (
          isHandedOnErrorName(a.meta?.originalErrorName) ||
          isHandedOnErrorName(a.error?.originalErrorName)
        ) {
          return result;
        }
        if (isStreamWrapperDuplicate(a)) return result;
        if (isExpectedFileReadRefusal(a)) return result;
        if (isCapturedSurfaceRegistrationError(a.error)) return result;
        captureError({
          source: "redux-rejected",
          relation: a.type.slice(0, -"/rejected".length),
          code:
            a.error?.code ??
            a.meta?.originalErrorName ??
            a.error?.originalErrorName ??
            a.error?.name,
          message: messageOf(a),
          name:
            a.meta?.originalErrorName ??
            a.error?.originalErrorName ??
            a.error?.name,
          requestId: a.meta?.executionRequestId ?? a.error?.executionRequestId,
          conversationId: a.meta?.conversationId ?? a.error?.conversationId,
          stack: a.error?.stack,
          raw: {
            type: a.type,
            payload: a.payload,
            error: a.error,
            requestId: a.meta?.requestId,
          },
        });
      }
    } catch {
      /* capture must never break the dispatch chain */
    }
    return result;
  };
