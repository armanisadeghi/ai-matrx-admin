/**
 * When an EXISTING person is shown Meet Matrx once (Arman, 2026-10-18: "show it to all users").
 * Pure, so the rules are testable: the card never competes with another first-run step.
 *
 *   - signed in, and not yet seen (`user_metadata.meet_matrx_seen`, server-side, per person)
 *   - an EXISTING account: onboarding complete, or created more than a day ago. Almost no old account carries
 *     the onboarding mark (2 of 804), so that mark alone must never be the gate. A brand-new signup gets Meet
 *     Matrx as a step of /welcome instead.
 *   - on a natural landing (home, chat home, agents home) only, never mid-flow on a page they came to work on
 *   - the age question is settled (declared on the account, read from the server; or already asked/skipped in
 *     an earlier load of this tab session) so the two never stack, and it never waits past the next visit
 *   - not shown twice in one tab session (a failed save must not loop)
 */
import { isOnboardingComplete } from "@/utils/onboarding";
import { meetMatrxSeen } from "@/features/onboarding/welcome-steps/welcomeSteps";

export const MEET_MATRX_INTRO_SESSION_KEY = "matrx.meet_matrx_intro.shown.v1";

type MetadataCarrier =
  | { user_metadata?: Record<string, unknown> | null; created_at?: string | null }
  | null
  | undefined;

/** An account older than this is "existing" even without the onboarding mark. */
export const NEW_ACCOUNT_GRACE_MS = 24 * 60 * 60 * 1000;

const LANDING_PATHS = new Set(["/dashboard", "/chat", "/chat/new", "/agents", "/agents/all"]);

export function isHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return LANDING_PATHS.has(pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname);
}

/** Onboarding complete, or created before the grace window: not a brand-new signup. */
export function isExistingAccount(user: MetadataCarrier, now: number = Date.now()): boolean {
  if (!user) return false;
  if (isOnboardingComplete(user)) return true;
  const created = user.created_at ? Date.parse(user.created_at) : NaN;
  return Number.isFinite(created) && now - created > NEW_ACCOUNT_GRACE_MS;
}

export function shouldShowMeetMatrxIntro(opts: {
  user: MetadataCarrier;
  pathname: string | null | undefined;
  ageSettled: boolean;
  shownThisSession: boolean;
  now?: number;
}): boolean {
  if (!opts.user) return false;
  if (!isHomePath(opts.pathname)) return false;
  if (opts.shownThisSession) return false;
  if (!isExistingAccount(opts.user, opts.now)) return false;
  if (meetMatrxSeen(opts.user)) return false;
  return opts.ageSettled;
}
