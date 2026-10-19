/**
 * lib/api/session-token-sync.ts
 *
 * THE BEARER FOLLOWS THE SESSION. Every server call reads its token from Redux
 * (`userAuth.accessToken`), which is written once, when the page loads. A sign-in
 * made IN the tab — "Confirm it's you" in the Vault (password, emailed code), or a
 * token refresh — gave supabase-js a new session while Redux kept the old token,
 * so the very next reveal went out with the pre-confirmation token, the server
 * refused it again, and only a reload cured it (vault parity D1, 2026-10-19).
 *
 * This keeps Redux on the live session's token for the SAME person. A different
 * person signing in is identity drift, owned by `AuthSessionWatcher` — never
 * adopted here.
 *
 * supabase-js runs the listener before `signInWithPassword` / `verifyOtp`
 * resolve, so the call retried right after a confirmation already carries the
 * new token.
 */

import type { RootState } from "@/lib/redux/store";
import { setAccessToken, setTokenExpiry } from "@/lib/redux/slices/userAuthSlice";

type SessionLike = { access_token?: string | null; expires_at?: number | null; user?: { id?: string | null } | null } | null;

export interface SessionTokenSyncDeps {
  auth: { onAuthStateChange?: (cb: (event: string, session: SessionLike) => void) => unknown } | null | undefined;
  getStore: () => { getState: () => unknown; dispatch: (action: unknown) => unknown } | null | undefined;
}

/** The events that carry a new token for the person already signed in. */
const NEW_TOKEN_EVENTS = new Set(["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"]);

let started = false;

/** Starts following the session once per tab; later calls do nothing. */
export function startSessionTokenSync(deps: SessionTokenSyncDeps): void {
  if (started) return;
  const subscribe = deps.auth?.onAuthStateChange;
  if (typeof subscribe !== "function") return;
  started = true;
  subscribe.call(deps.auth, (event, session) => {
    const token = session?.access_token;
    if (!token || !NEW_TOKEN_EVENTS.has(event)) return;
    const store = deps.getStore();
    if (!store) return;
    const state = store.getState() as Partial<RootState> | undefined;
    const auth = state?.userAuth;
    // Only the person this tab is signed in as; nobody signed in yet is the load sync's job.
    if (!auth?.id || session?.user?.id !== auth.id) return;
    if (auth.accessToken === token) return;
    store.dispatch(setAccessToken(token));
    store.dispatch(setTokenExpiry(session?.expires_at ?? null));
  });
}

/** Test seam: forget that the sync started. */
export function resetSessionTokenSyncForTests(): void {
  started = false;
}
