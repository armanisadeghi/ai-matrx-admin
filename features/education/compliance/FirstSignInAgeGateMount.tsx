// features/education/compliance/FirstSignInAgeGateMount.tsx
//
// THE post-sign-in age prompt, platform-wide. Render-free.
//
// RULED BY ARMAN, 2026-08-20:
//   "It's not sign up. It's after the first time that they sign in. I don't
//    wanna get in the way of sign up for some bullshit like this. It's gonna be
//    one of those pop ups ... and makes it really easy for them to select their
//    age range. And the main thing is if they're over eighteen or not."
//
// So: nothing is asked during signup (the signup form's age field was removed in
// the same change), and the question is asked once the user is actually IN the
// app — mounted in `app/DeferredSingletonCore.tsx` beside AnnouncementProvider,
// the existing after-you-are-signed-in popup tree, which loads post-mount and
// post-idle so this never competes with first paint.
//
// SCOPE — signed-in accounts only (`reason === "age_undeclared"`). A GUEST
// (`guest_age_undeclared`) is deliberately NOT prompted here: a guest is not
// "signed in", and a guest is genuinely BLOCKED from education AI, so their
// prompt belongs where that block bites — `EducationAgeGateMount` and the
// per-action `useAiComplianceGate`. Exactly one prompt can fire per user.
//
// NOT A BLOCK. Verified against `prosrc` on 2026-08-20: `edu_coppa_gate_for`
// ALLOWS an undeclared signed-in account by design ("Undeclared SIGNED-IN ->
// ALLOW (nudge only; do not re-break established accounts)"). Docs asserting
// that a null band kills AI runs for signed-in users are WRONG. This prompt
// exists to move people out of the undeclared state, not to unblock them —
// which is exactly why it must never be modal-feeling or hard to escape.
//
// DISMISSAL. Closing it writes nothing and blocks nothing; we simply do not ask
// again for the rest of this tab session (sessionStorage), and ask again on the
// next one. The band is never left permanently NULL with no way back: the
// per-action gate still offers the same prompt inside education AI, and
// /education/family can always set it. Deliberately no "don't ask again" —
// COPPA declaration is not a preference to opt out of.

// SUPPRESSED ON `/portal` (the departed-member portal, app/(portal)) — DEFERRED, NOT WAIVED.
// Decided 2026-08-29 (continued-access HANDOFF §5): the portal's whole content is one
// income-disclosure consent decision, and this popup opened on top of it. Suppression is
// honest here precisely because this prompt is a NUDGE, not a block (see above): skipping it
// removes no COPPA protection — the same undeclared account is asked again on any general
// platform surface next session, and the per-action gate still bites inside education AI,
// which the portal does not offer. We deliberately do NOT satisfy the gate from the
// employment record instead: employment does not prove 18+ (minors are legally employable),
// so deriving a band from it would fabricate a declaration the person never made.
// The suppression must not touch `markAskedThisSession` — a portal visit is not "asked".
// Scope: exactly the `(portal)` route group's URL space, nothing wider.

// WHEN THE GATE IS READ (owner rule, 2026-10-16: nothing fetches until it is needed). The prompt must
// still appear UNPROMPTED after a first sign-in (Arman's ruling above), so the `edu_coppa_gate` read
// runs ONCE, after the page has fully settled (lib/boot/lateIdle) — never at mount. Education AI never
// depends on this read: every education run goes through the per-action `useAiComplianceGate` and
// education routes through `EducationAgeGateMount`. A declared band never goes back to undeclared,
// so once this browser has seen this person's band the read is never made again (localStorage,
// per person) — previously every new tab re-read it.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useEngagedLateReady } from "@/lib/boot/engagedLate";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { coppaService } from "./coppaService";
import { useAiComplianceGate } from "./useAiComplianceGate";

/** Ask at most once per tab session; a new session asks again. */
const SESSION_KEY = "matrx.age_band_prompt.asked.v1";

function alreadyAskedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    // Private mode / storage disabled — degrade to "ask once per mount", which
    // is what this singleton gives us anyway. Never let storage break the flow.
    return false;
  }
}

const DECLARED_KEY_PREFIX = "matrx.age_band_declared.v1:";

function declaredInThisBrowser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(DECLARED_KEY_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

function markDeclaredInThisBrowser(userId: string | null | undefined): void {
  if (!userId) return;
  try {
    localStorage.setItem(DECLARED_KEY_PREFIX + userId, "1");
  } catch {
    /* storage disabled — the session mark still applies */
  }
}

/** The age question was put to this person in this tab session (asked or skipped): the popup does not ask again until the next session. */
export function markAskedThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* see above */
  }
}

/**
 * The age question is settled for this person in this browser, so a popup is not about to open: their band is
 * declared here, or (unless `declaredOnly`) it was already asked this tab session. Read by other first-run
 * surfaces (Meet Matrx) so two prompts never stack.
 */
export function ageQuestionSettled(userId: string | null | undefined, opts?: { declaredOnly?: boolean }): boolean {
  if (declaredInThisBrowser(userId)) return true;
  return opts?.declaredOnly ? false : alreadyAskedThisSession();
}

export function FirstSignInAgeGateMount() {
  const pathname = usePathname();
  // The departed-member portal — see the header block. Deferred, never waived.
  const onPortal = pathname === "/portal" || pathname?.startsWith("/portal/");
  // The sign-up welcome (/welcome) asks the SAME question itself, as its own calm step (WelcomeAgeStep), so a popup
  // here would sit on top of another step. Deferred, never waived: the step records its answer or a skip, and a
  // skipped person is asked on the next session on any other surface, exactly like the portal.
  const onWelcome = pathname === "/welcome" || pathname?.startsWith("/welcome/");
  // Asked already this tab session (or on the portal): the `edu_coppa_gate` read is never made.
  const userId = useAppSelector(selectUser)?.id ?? null;
  const [askedAtMount] = useState(alreadyAskedThisSession);
  // Settled AND engaged (2026-10-17): a page nobody touches never reads the gate.
  const settled = useEngagedLateReady();
  const declared = declaredInThisBrowser(userId);
  const gate = useAiComplianceGate({
    declarationVariant: "first_run",
    enabled: settled && !onPortal && !onWelcome && !askedAtMount && !declared,
  });
  const { loading, gate: verdict, promptDeclarationIfNeeded, reload } = gate;
  // The silent signup-metadata apply is tried at most once per mount.
  const triedMetaApply = useRef(false);

  useEffect(() => {
    if (onPortal || onWelcome) return;
    if (loading) return;
    // A declared band never goes back to undeclared: nothing is left to ask this session, so a
    // reload in this tab does not read the gate again.
    if (verdict && verdict.ageBand !== null) {
      markAskedThisSession();
      markDeclaredInThisBrowser(userId);
      return;
    }
    // Signed-in AND undeclared is the only case this mount owns. A guest or a
    // still-loading gate is a no-op.
    if (!verdict || verdict.reason !== "age_undeclared") return;
    if (alreadyAskedThisSession()) return;

    let cancelled = false;
    void (async () => {
      // A tail of accounts created before the signup age field was removed may
      // still carry `education_age_band` in auth metadata. Honour it silently —
      // never ask a question they already answered.
      if (!triedMetaApply.current) {
        triedMetaApply.current = true;
        const fromSignup = await coppaService.signupAgeBand();
        if (fromSignup) {
          const res = await coppaService.setAgeBand(fromSignup);
          if (cancelled) return;
          // A first declaration can never be `status: "blocked"` (the block only
          // fires on a self-declared move UP out of under_13), so any non-error
          // outcome means the band is settled — re-read and stop.
          if (!res.error) {
            reload();
            return;
          }
        }
      }
      if (cancelled) return;
      markAskedThisSession();
      promptDeclarationIfNeeded();
    })();

    return () => {
      cancelled = true;
    };
  }, [onPortal, onWelcome, loading, verdict, promptDeclarationIfNeeded, reload, userId]);

  if (onPortal || onWelcome) return null;
  return <gate.Gate />;
}
