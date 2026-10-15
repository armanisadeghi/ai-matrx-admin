/**
 * Google Identity Services — the `google.accounts.id` half (One Tap / "Continue as …").
 *
 * The `oauth2` half (Drive and the other product connections) lives in `GoogleApiProvider.tsx`; both
 * ride the SAME script (`GOOGLE_IDENTITY_SCRIPT_SRC`) under the SAME bounded readiness wait. This file
 * holds the `id` namespace's types and a promise-shaped loader for surfaces that sit outside the
 * provider tree — the sign-in and sign-up pages render no `Providers`, and One Tap must not wait for
 * the product-connection provider to mount.
 */

import {
  GOOGLE_IDENTITY_POLL_INTERVAL_MS,
  GOOGLE_IDENTITY_READY_TIMEOUT_MS,
  GOOGLE_IDENTITY_SCRIPT_SRC,
} from "./googleIdentityReadiness";

/** What Google hands the page when a person picks an account: a signed ID token (`credential`). */
export interface GoogleIdCredentialResponse {
  credential: string;
  select_by?: string;
}

/** https://developers.google.com/identity/gsi/web/reference/js-reference#IdConfiguration */
export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleIdCredentialResponse) => void;
  /** SHA-256 hex of the raw nonce; the raw one goes to Supabase, which hashes and compares. */
  nonce?: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
  use_fedcm_for_button?: boolean;
  log_level?: "debug" | "info" | "warn";
}

export interface GoogleIdNamespace {
  initialize: (config: GoogleIdConfiguration) => void;
  prompt: () => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

/**
 * Resolves `true` once `window.google.accounts.id` exists, `false` when the bound passes first (a
 * content blocker, a network filter, an outage). Re-uses a script tag another loader already inserted.
 */
export function loadGoogleIdentityId(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  return new Promise((resolve) => {
    const deadline = Date.now() + GOOGLE_IDENTITY_READY_TIMEOUT_MS;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const check = () => {
      if (settled) return;
      if (window.google?.accounts?.id) return finish(true);
      if (Date.now() >= deadline) return finish(false);
      setTimeout(check, GOOGLE_IDENTITY_POLL_INTERVAL_MS);
    };
    if (!document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => finish(false);
      document.body.appendChild(script);
    }
    check();
  });
}
