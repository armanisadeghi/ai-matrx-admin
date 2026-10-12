/**
 * sessionBarrier.ts — NO AUTHENTICATED READ LEAVES THIS CLIENT BEFORE THE SESSION IS ATTACHED (DD-237).
 *
 * The barrier itself (wait for the first auth report, retry a "no identity" refusal once, never retry a
 * foreign-authority token, announce every firing) lives in `@ai-matrx/auth` `createSessionBarrier`. This
 * file only injects what is THIS app's policy: where a firing is recorded (the Error Inspector), which
 * doors serve a guest by design (`anonymousByDesignDoors.ts`), and where an ended session sends the person
 * (`unverifiableSession.ts`). It is bound to the browser client in `lib/diagnostics/supabaseErrorCapture.ts`
 * (via `utils/supabase/authCookie.ts`), so every `.from()`, `.rpc()` and `.schema().from()/.rpc()` inherits
 * it. `pnpm check:session-first-reads` keeps it that way.
 *
 * Measured defect (production, 2026-09-14): a read that raced the session, or a long-lived tab whose refresh
 * failed, went out as `anon` and came back `42501` HTTP 401 — silently. The full story and the doctrine
 * (the barrier never refuses a read on its own authority; the anonymous-by-design list only removes the
 * RETRY, never the wait) are in the package's `session-barrier.ts`.
 */

import { createSessionBarrier, type BarrierSessionMarker, type BarrierSessionState } from "@ai-matrx/auth";

import { captureError, setSessionStateProbe } from "@/lib/diagnostics/errorCaptureStore";
import {
  bypassesSessionWait,
  isAnonymousByDesign,
} from "@/utils/supabase/anonymousByDesignDoors";
import { endUnverifiableSession } from "@/utils/supabase/unverifiableSession";

export {
  SESSION_ATTACH_BUDGET_MS,
  SESSION_RECOVERY_BUDGET_MS,
  WAIT_COOLDOWN_MS,
  type BarrierCallContext,
} from "@ai-matrx/auth";

export type SessionState = BarrierSessionState;
export type SessionStateMarker = BarrierSessionMarker;

const barrier = createSessionBarrier({
  report: (event) =>
    captureError({
      source: "supabase-postgrest",
      operation: "unknown",
      schema: event.schema,
      relation: event.relation,
      code: event.code,
      message: event.message,
      status: event.status,
      sessionState: event.sessionState,
      durable: event.durable,
    }),
  isAnonymousByDesign,
  bypassesSessionWait,
  endUnverifiable: endUnverifiableSession,
  setSessionStateProbe,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

export const installSessionBarrier = barrier.install;
/** Test seam — forget the binding and every waiter. */
export const resetSessionBarrierForTests = barrier.reset;
/** Test seam — drive the signal without a Supabase client. */
export const announceSessionForTests = barrier.announceSession;
export const authCookiePresent = barrier.authCookiePresent;
export const sessionStateNow = barrier.sessionStateNow;
export const sessionStateMarker = barrier.sessionStateMarker;
export const hasAttachedSession = barrier.hasAttachedSession;
export const whenSessionAttached = barrier.whenSessionAttached;
export const canSendImmediately = barrier.canSendImmediately;
export const awaitSessionBeforeSend = barrier.awaitSessionBeforeSend;
export const isSessionRefusal = barrier.isSessionRefusal;
export const shouldRecoverSession = barrier.shouldRecoverSession;
export const endSessionIfUnverifiable = barrier.endSessionIfUnverifiable;
export const recoverSessionForRetry = barrier.recoverSessionForRetry;
export const reportSessionRetryOutcome = barrier.reportSessionRetryOutcome;
