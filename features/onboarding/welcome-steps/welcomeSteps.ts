/**
 * The sign-up welcome as ONE calm sequence (Arman, 2026-10-17): one heading on screen at a time.
 *
 *   identity  — Smart Add's door ("here's what we found"). NEVER on the way in (Arman, 2026-10-17: "They souldn't
 *               sit around wiating for this ... If you have the info, you show them something. If you don't, then you
 *               do it in the background"): it is a step only when asked for (`/welcome?found=1`); a new account
 *               starts on the age question / Meet Matrx, and the search runs in the background.
 *   age       — the age question (over / under 18, then the minor split), once, only if the account has not declared.
 *               It was a site-wide popup on top of whatever page was open (FirstSignInAgeGateMount); on /welcome it is
 *               this step instead. A nudge, not a wall (edu_coppa_gate allows an undeclared signed-in account), so
 *               it has a way out ("Not now") and is asked again next session elsewhere. Never before identity.
 *   meet      — Meet Matrx (features/onboarding/meet-matrx).
 *   start     — "Pick a place to start" tiles.
 *
 * Progress is per person and server-side: `user_metadata.meet_matrx_seen` on the auth user (the same carrier as
 * `onboarding_completed`, read at SSR so the first frame is already the right step: no flash, no shift).
 * Opening /meet-matrx never reads or changes it.
 */

export type WelcomeStep = "identity" | "age" | "meet" | "start";

export const MEET_MATRX_SEEN_KEY = "meet_matrx_seen" as const;

type MetadataCarrier = { user_metadata?: Record<string, unknown> | null } | null | undefined;

/** The person has been through (or out of) the Meet Matrx step. */
export function meetMatrxSeen(user: MetadataCarrier): boolean {
  return user?.user_metadata?.[MEET_MATRX_SEEN_KEY] === true;
}

/**
 * The step a visit starts on. Nothing waits on the "here's what we found" search: identity only when explicitly asked
 * for. A new account starts on the age step (it moves on by itself when nothing is owed); anyone who has met Matrx goes
 * straight to the tiles.
 */
export function firstStep(opts: { newUser: boolean; meetSeen: boolean; foundAsked?: boolean }): WelcomeStep {
  if (opts.foundAsked) return "identity";
  if (opts.newUser) return "age";
  return opts.meetSeen ? "start" : "meet";
}

/**
 * The step after this one. `ageNeeded`: true = not declared, false = declared (or not a signed-in subject), null = not
 * read yet (the age step itself waits for the answer, then asks or moves on, so identity never waits on a read).
 * A repeat visit never lands on Meet Matrx.
 */
export function nextStep(step: WelcomeStep, meetSeen: boolean, ageNeeded: boolean | null = false): WelcomeStep {
  if (step === "identity") {
    if (ageNeeded !== false) return "age";
    return meetSeen ? "start" : "meet";
  }
  if (step === "age") return meetSeen ? "start" : "meet";
  return "start";
}
