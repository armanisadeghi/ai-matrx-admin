// utils/auth/adminMfa.ts — ADMINISTRATOR MFA ADMISSION for server code (READY-04).
//
// The rule: an admin-power request is honored only from an aal2 session WHEN the
// `platform.auth / admin_mfa_required` knob is on. The verdict is the database's
// own `platform.admin_session_state()` (migration 20261021215557), read as the
// request's signed-in person — never a second MFA system, never the service key.
// Knob off = `not_required` = every gate behaves exactly as before.
//
// Server-only: the cookie client is imported lazily so this module (and
// `userSessionData.ts`, which composes it) never pulls `next/headers` into a
// client bundle or a test that does not call it.

import type { SupabaseClient } from "@supabase/supabase-js";
import { safeReturnUrl } from "@/utils/auth/safe-redirect";

export type AdminMfaVerdict =
  /** Knob off: administrator power is unchanged. */
  | { readonly state: "not_required" }
  /** Knob on and this session is a current aal2 administrator session. */
  | { readonly state: "admitted" }
  /** Knob on and this session must verify (or enroll) first. */
  | { readonly state: "challenge"; readonly reason: string }
  /** The verdict could not be read: admin power is refused, never assumed. */
  | { readonly state: "unavailable" };

/** The path an administrator is sent to when they must verify or enroll. */
export const ADMIN_VERIFY_PATH = "/auth/admin-verify";

/**
 * The refusal sentence for API routes and server actions. It starts with
 * "Forbidden" because the admin routes map that prefix to HTTP 403.
 */
export const ADMIN_MFA_REFUSAL = "Forbidden: verify with your authenticator to use administration.";

export class AdminMfaRequiredError extends Error {
  readonly status = 403;
  constructor() {
    super(ADMIN_MFA_REFUSAL);
    this.name = "AdminMfaRequiredError";
  }
}

/** May this verdict use administrator power? */
export function adminMfaAllows(verdict: AdminMfaVerdict): boolean {
  return verdict.state === "not_required" || verdict.state === "admitted";
}

/** Parse the database verdict. Anything malformed is `unavailable` (refused). */
export function parseAdminSessionState(value: unknown): AdminMfaVerdict {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { state: "unavailable" };
  const row = value as Record<string, unknown>;
  if (typeof row.mfa_required !== "boolean" || typeof row.admitted !== "boolean") {
    return { state: "unavailable" };
  }
  if (!row.mfa_required) return { state: "not_required" };
  if (row.admitted) return { state: "admitted" };
  return { state: "challenge", reason: typeof row.reason === "string" ? row.reason : "insufficient_aal" };
}

type AdmissionClient = Pick<SupabaseClient, "schema">;

/** One read of the current session's verdict through the given SIGNED-IN client. */
export async function readAdminMfaVerdictWith(client: AdmissionClient): Promise<AdminMfaVerdict> {
  try {
    const { data, error } = await client.schema("platform").rpc("admin_session_state");
    if (error) {
      console.error("[admin-mfa] admin_session_state failed; refusing admin power:", error.message);
      return { state: "unavailable" };
    }
    return parseAdminSessionState(data);
  } catch (reason) {
    console.error("[admin-mfa] admin_session_state threw; refusing admin power:", reason);
    return { state: "unavailable" };
  }
}

/**
 * The verdict for THIS request's own session (cookie client), whatever client
 * the caller holds — a gate that was handed a service-role client still asks
 * as the person, so the service key can never stand in for their assurance.
 */
export async function readAdminMfaVerdict(): Promise<AdminMfaVerdict> {
  const { createClient } = await import("@/utils/supabase/server");
  return readAdminMfaVerdictWith(await createClient());
}

/** The verify page for this destination (relative, so it works on every host). */
export function adminVerifyHref(destination: string): string {
  return `${ADMIN_VERIFY_PATH}?redirectTo=${encodeURIComponent(destination)}`;
}

/** The admin dashboard SPA's own origin: not on aimatrx.com, so named exactly. */
export const ADMIN_DASHBOARD_ORIGIN = "https://admin.app.matrxserver.com";

/**
 * Where the verify page may send the person afterwards: a same-site path, an
 * aimatrx.com host (manage., admin., www.), or the admin dashboard's exact
 * origin. Anything else falls back to /administration.
 */
export function adminVerifyDestination(value: string | undefined | null): string {
  if (value && /^https:\/\//i.test(value) && !/[\\\s]/.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin === ADMIN_DASHBOARD_ORIGIN && !url.username && !url.password) return url.href;
    } catch {
      // Not a URL: the relative / aimatrx.com check below decides.
    }
  }
  return safeReturnUrl(value, "/administration");
}
