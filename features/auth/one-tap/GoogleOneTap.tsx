"use client";

// THE Google One Tap prompt ("Continue as <name>") for a signed-out visitor. Renders nothing of its
// own: Google draws the prompt (through the browser's FedCM sheet where supported). The existing
// Google / Apple / GitHub buttons stay the fallback for every browser that shows no prompt.
//
// Flow: Google signs an ID token carrying our hashed nonce → `signInWithGoogleOneTap` establishes the
// session inside the guest handover → the page reloads in place (or, where `landing` is set — sign-in,
// sign-up, the home page — opens the end of every sign-in path: the page she asked for, else her saved
// layout's landing, else /dashboard; decided on the server by `signInDestination`). New Google accounts are created by the
// same click. Mount it through `GoogleOneTapMount`, which reads the auto-select knob on the server.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { googleIdentityOriginRegistrable } from "@/providers/google-provider/googleIdentityReadiness";

// The prompt's machinery (claims cache, fingerprint, Google's script loader, the sign-in action,
// toasts) loads through ONE import() after the page is idle, so a marketing page's first load
// never carries it (PUBLIC-LAYOUT-PERF, 2026-10-19). Guard: app/__tests__/public-layout-stays-light.test.ts
type OneTapModule = typeof import("./oneTapPrompt");

export interface GoogleOneTapProps {
  /** Sign a returning Google account in on arrival (`auth.one_tap_auto_select`). */
  autoSelect: boolean;
  /** The prompt's wording: "Sign in to", "Sign up for", or "Use" AI Matrx with Google. */
  context?: "signin" | "signup" | "use";
  /** Hand the person on after sign-in (`redirectTo` = the page she asked for, or null) instead of reloading. */
  landing?: { redirectTo: string | null };
  /** Paths (by prefix) where this mount stays quiet — a layout that covers errand links. */
  skipPrefixes?: readonly string[];
}

export function GoogleOneTap({ autoSelect, context = "use", landing, skipPrefixes }: GoogleOneTapProps) {
  const landingRedirectTo = landing ? (landing.redirectTo ?? "") : null;
  const pathname = usePathname();
  const skipped = Boolean(skipPrefixes?.some((prefix) => pathname?.startsWith(prefix)));

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // A preview address can never be a registered Google origin; the sign-in buttons remain.
    if (!clientId || skipped || !googleIdentityOriginRegistrable(window.location.hostname)) return undefined;
    // React's dev double-mount cancels the first pass; the second one prompts.
    let cancelled = false;

    const run = () => {
      void import("./oneTapPrompt")
        .then((m: OneTapModule) =>
          m.runOneTapPrompt({ clientId, autoSelect, context, landingRedirectTo, isCancelled: () => cancelled }),
        )
        .catch((error: unknown) => console.warn("[one-tap] the prompt did not load; the sign-in buttons remain.", error));
    };
    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle ? window.requestIdleCallback(run, { timeout: 3000 }) : window.setTimeout(run, 1500);

    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      window.google?.accounts?.id?.cancel();
    };
  }, [autoSelect, context, landingRedirectTo, skipped]);

  return null;
}
