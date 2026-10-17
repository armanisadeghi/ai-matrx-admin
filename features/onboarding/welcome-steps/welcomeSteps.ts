/**
 * The sign-up welcome as ONE calm sequence (Arman, 2026-10-17): one heading on screen at a time.
 *
 *   identity  — Smart Add's door (the name ask, or "here's what we found" when the login already gives a
 *               name: it is never asked what the login answers). New accounts only.
 *   meet      — Meet Matrx (features/onboarding/meet-matrx).
 *   start     — "Pick a place to start" tiles.
 *
 * Progress is per person and server-side: `user_metadata.meet_matrx_seen` on the auth user (the same carrier as
 * `onboarding_completed`, read at SSR so the first frame is already the right step: no flash, no shift).
 * Opening /meet-matrx never reads or changes it.
 */

export type WelcomeStep = "identity" | "meet" | "start";

export const MEET_MATRX_SEEN_KEY = "meet_matrx_seen" as const;

type MetadataCarrier = { user_metadata?: Record<string, unknown> | null } | null | undefined;

/** The person has been through (or out of) the Meet Matrx step. */
export function meetMatrxSeen(user: MetadataCarrier): boolean {
  return user?.user_metadata?.[MEET_MATRX_SEEN_KEY] === true;
}

/** The step a visit starts on. A new account starts with who they are; anyone who has met Matrx goes straight to the tiles. */
export function firstStep(opts: { newUser: boolean; meetSeen: boolean }): WelcomeStep {
  if (opts.newUser) return "identity";
  return opts.meetSeen ? "start" : "meet";
}

/** The step after this one, given whether Meet Matrx was already seen (a repeat visit never lands on it). */
export function nextStep(step: WelcomeStep, meetSeen: boolean): WelcomeStep {
  if (step === "identity") return meetSeen ? "start" : "meet";
  return "start";
}
