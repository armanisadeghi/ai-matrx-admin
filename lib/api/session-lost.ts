/**
 * lib/api/session-lost.ts — the ONE answer to "the server no longer knows this session".
 *
 * The website trusts the cookie JWT (verified locally), the Python server checks the session row.
 * When the row is gone (revoked, signed out elsewhere) every server call answers 401
 * `auth_required` while every page still looks signed in. Called from the shared error chokepoint
 * (`captureApiError`, reached by `serverApi`, `python-client` and `callApi`), so no feature handles
 * this itself:
 *
 *   1. try ONE token refresh;
 *   2. if it fails — or a refresh already happened a moment ago and the server still refuses —
 *      clear the dead local session and go to /login carrying the page the person was on.
 *
 * The call that failed still throws to its caller, which shows its own inline error.
 */

import { loginHref } from "@/utils/auth/auth-destination";
import { getStore } from "@/lib/redux/store-singleton";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { supabase } from "@/utils/supabase/client";
import type { RootState } from "@/lib/redux/store";

/** A refresh that worked this recently, followed by another refusal, means the refresh did not cure it. */
export const REFRESH_TRUST_MS = 60_000;

let inFlight: Promise<SessionLostOutcome> | null = null;
let lastRefreshAt = 0;

export type SessionLostOutcome = "ignored" | "refreshed" | "redirected";

/** Is this failure the server saying it does not know the signed-in session? */
export function isServerSessionRefusal(e: { status?: number | null; code?: string | null; message?: string | null }): boolean {
  if (e.status !== 401) return false;
  return e.code === "auth_required" || /authentication required/i.test(e.message ?? "");
}

function hasMemberSession(): boolean {
  const store = getStore();
  return !!store && !!selectAccessToken(store.getState() as RootState);
}

let navigate: (href: string) => void = (href) => window.location.assign(href);

function goToLogin(): void {
  navigate(loginHref(`${window.location.pathname}${window.location.search}`));
}

async function handle(now: number): Promise<SessionLostOutcome> {
  if (now - lastRefreshAt > REFRESH_TRUST_MS) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token) {
        lastRefreshAt = Date.now();
        return "refreshed";
      }
    } catch {
      // Falls through to the sign-in redirect below.
    }
  }
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The local clear is best effort; the redirect still happens.
  }
  goToLogin();
  return "redirected";
}

export function noteServerSessionRefusal(
  e: { status?: number | null; code?: string | null; message?: string | null },
  now: number = Date.now(),
): Promise<SessionLostOutcome> {
  if (typeof window === "undefined" || !isServerSessionRefusal(e) || !hasMemberSession()) return Promise.resolve("ignored");
  if (/^\/(login|sign-up|auth)(\/|$)/.test(window.location.pathname)) return Promise.resolve("ignored");
  if (!inFlight) {
    inFlight = handle(now).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** Test seam. */
export function resetSessionLostForTests(go?: (href: string) => void): void {
  inFlight = null;
  lastRefreshAt = 0;
  navigate = go ?? ((href) => window.location.assign(href));
}
