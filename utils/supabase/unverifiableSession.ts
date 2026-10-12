/**
 * unverifiableSession.ts — A SESSION THIS DATABASE CANNOT VERIFY IS ENDED, NOT
 * RETRIED.
 *
 * THE DEFECT (Arman, /marketing on the shared dev server, 2026-10-02). The
 * browser held a session minted by a DIFFERENT auth authority — live vs the
 * nightly clone, or yesterday's clone, each a separate project with its own
 * JWT signing key. Such a token is well-formed and unexpired, so `getSession()`
 * hands it out happily, but the database the page talks to cannot verify it:
 * every read came back `401 PGRST301 "No suitable key or wrong key type"`. The
 * session barrier read that as "no session yet", re-resolved the SAME foreign
 * session, retried, failed again — and logged SESSION_BARRIER_RECOVERED "served,
 * nothing was lost". Meanwhile the chat refused to start ("mandate resolution
 * requires an authenticated session") and the page sat half-working.
 *
 * WHAT THIS DOES. On the first sign — a PGRST301 refusal, or a claims check
 * that the auth authority settled as "this token is not ours" — it asks the
 * authority once (`getClaims`, which verifies the signature against the
 * authority's own keys), and only when that ALSO says the token is
 * unverifiable it ends the session on this device (`signOut({scope:"local"})`,
 * the one sign-out scope this app allows), records it, and sends the person to
 * sign in with one short sentence. An outage (transport failure, spent budget)
 * is never read as a bad token, and an expired token is never treated as
 * foreign — refresh owns that case.
 */

import type { JWK } from "@supabase/supabase-js";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import {
  captureAuthDestination,
  loginHref,
} from "@/utils/auth/auth-destination";
import { confirmUnverifiableSession as confirmFromPackage } from "@ai-matrx/auth";

/** The sentence on the sign-in page. Error-state slot: ≤ 140 chars. */
export const UNVERIFIABLE_SESSION_NOTICE =
  "Your session couldn't be verified here. Sign in again.";


export interface UnverifiableSessionAuth {
  getClaims(
    jwt?: string,
    options?: { jwks?: { keys: JWK[] } },
  ): Promise<{ data: unknown; error: { name?: string; code?: string; status?: number; message?: string } | null }>;
  signOut(options: { scope: "local" }): Promise<unknown>;
}

/** Ask the authority once: is the stored session's token one it can verify? (package detector) */
export function confirmUnverifiableSession(
  auth: Pick<UnverifiableSessionAuth, "getClaims">,
): Promise<boolean> {
  return confirmFromPackage(auth, process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Where the person is sent: sign-in, carrying the page they were on. */
export function unverifiableSessionLoginHref(pathname: string, search: string): string {
  const href = loginHref(captureAuthDestination(pathname, search));
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("error", UNVERIFIABLE_SESSION_NOTICE);
  return `${path}?${params.toString()}`;
}

let ending: Promise<void> | null = null;
let navigateTo: (href: string) => void = (href) => window.location.assign(href);

/** Test seam — forget the single flight; optionally observe the navigation. */
export function resetUnverifiableSessionForTests(navigate?: (href: string) => void): void {
  ending = null;
  navigateTo = navigate ?? ((href) => window.location.assign(href));
}

/**
 * End the unverifiable session on this device and send the person to sign
 * in. Single-flight: a page's twenty refused reads end it once.
 */
export function endUnverifiableSession(
  auth: Pick<UnverifiableSessionAuth, "signOut">,
  where: { door: string; via: "postgrest" | "claims" },
): Promise<void> {
  if (ending) return ending;
  ending = (async () => {
    captureError({
      source: "supabase-postgrest",
      operation: "unknown",
      code: "SESSION_UNVERIFIABLE",
      message:
        `${where.door} was refused because this browser's session was minted by a ` +
        `different auth authority than the database this page talks to (seen via ` +
        `${where.via}). The session was ended on this device and the person was ` +
        `sent to sign in.`,
      status: 401,
      sessionState: "pre_attach",
      durable: true,
    });
    try {
      await auth.signOut({ scope: "local" });
    } catch {
      /* the redirect still happens; a stale cookie is re-checked there */
    }
    if (typeof window === "undefined") return;
    const { pathname, search } = window.location;
    if (pathname !== "/login") {
      navigateTo(unverifiableSessionLoginHref(pathname, search));
      return;
    }
    // Already on sign-in (the proxy bounced a protected route there before the
    // browser could tell): add the notice once, keeping the destination. A page
    // that already carries it never navigates, so a cookie that outlived the
    // sign-out cannot loop.
    const params = new URLSearchParams(search);
    if (params.get("error") === UNVERIFIABLE_SESSION_NOTICE) return;
    params.set("error", UNVERIFIABLE_SESSION_NOTICE);
    navigateTo(`/login?${params.toString()}`);
  })();
  return ending;
}
