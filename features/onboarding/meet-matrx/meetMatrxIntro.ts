/**
 * When an EXISTING person is shown Meet Matrx once (Arman, 2026-10-18: "show it to all users").
 * Pure, so the rules are testable: the card never competes with another first-run step.
 *
 *   - signed in, and not yet seen (`user_metadata.meet_matrx_seen`, server-side, per person)
 *   - onboarding already complete: a brand-new account gets Meet Matrx as a step of /welcome instead
 *   - on home (/dashboard) only: a natural landing, never mid-flow on a page they came to work on
 *   - the age question is settled (declared in this browser, or already asked in an earlier load of
 *     this tab session) so the two never stack
 *   - not shown twice in one tab session (a failed save must not loop)
 */
import { isOnboardingComplete } from "@/utils/onboarding";
import { meetMatrxSeen } from "@/features/onboarding/welcome-steps/welcomeSteps";

export const MEET_MATRX_INTRO_SESSION_KEY = "matrx.meet_matrx_intro.shown.v1";

type MetadataCarrier = { user_metadata?: Record<string, unknown> | null } | null | undefined;

export function isHomePath(pathname: string | null | undefined): boolean {
  return pathname === "/dashboard" || pathname === "/dashboard/";
}

export function shouldShowMeetMatrxIntro(opts: {
  user: MetadataCarrier;
  pathname: string | null | undefined;
  ageSettled: boolean;
  shownThisSession: boolean;
}): boolean {
  if (!opts.user) return false;
  if (!isHomePath(opts.pathname)) return false;
  if (opts.shownThisSession) return false;
  if (!isOnboardingComplete(opts.user)) return false;
  if (meetMatrxSeen(opts.user)) return false;
  return opts.ageSettled;
}
