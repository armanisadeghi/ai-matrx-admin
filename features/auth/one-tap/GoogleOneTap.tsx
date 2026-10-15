"use client";

// THE Google One Tap prompt ("Continue as <name>") for a signed-out visitor. Renders nothing of its
// own: Google draws the prompt (through the browser's FedCM sheet where supported). The existing
// Google / Apple / GitHub buttons stay the fallback for every browser that shows no prompt.
//
// Flow: Google signs an ID token carrying our hashed nonce → `signInWithGoogleOneTap` establishes the
// session inside the guest handover → the page reloads in place (or, on the sign-in and sign-up
// pages, opens the destination the person was headed for). New Google accounts are created by the
// same click. Mount it through `GoogleOneTapMount`, which reads the auto-select knob on the server.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getClientClaimsUserCached } from "@/utils/supabase/clientClaimsCache";
import { getFingerprint } from "@/lib/services/fingerprint-service";
import { toast } from "@/lib/toast";
import { loadGoogleIdentityId } from "@/providers/google-provider/googleIdentityId";
import { signInWithGoogleOneTap } from "./actions";
import { landAfterSignIn } from "./landAfterSignIn";

export interface GoogleOneTapProps {
  /** Sign a returning Google account in on arrival (`auth.one_tap_auto_select`). */
  autoSelect: boolean;
  /** The prompt's wording: "Sign in to", "Sign up for", or "Use" AI Matrx with Google. */
  context?: "signin" | "signup" | "use";
  /** After sign-in, open this path instead of reloading the current page (auth pages only). */
  destination?: string;
  /** Paths (by prefix) where this mount stays quiet — a layout that covers errand links. */
  skipPrefixes?: readonly string[];
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function GoogleOneTap({ autoSelect, context = "use", destination, skipPrefixes }: GoogleOneTapProps) {
  const pathname = usePathname();
  const skipped = Boolean(skipPrefixes?.some((prefix) => pathname?.startsWith(prefix)));

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || skipped) return undefined;
    // React's dev double-mount cancels the first pass; the second one prompts.
    let cancelled = false;

    void (async () => {
      const { data } = await getClientClaimsUserCached();
      const user = data.user as { is_anonymous?: boolean } | null;
      if (cancelled || (user && user.is_anonymous !== true)) return;

      if (!(await loadGoogleIdentityId()) || cancelled) {
        console.warn("[one-tap] Google's sign-in script did not load; the sign-in buttons remain.");
        return;
      }
      const id = window.google?.accounts?.id;
      if (!id) return;

      const rawNonce = randomNonce();
      const hashedNonce = await sha256Hex(rawNonce);
      if (cancelled) return;

      id.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        auto_select: autoSelect,
        context,
        use_fedcm_for_prompt: true,
        itp_support: true,
        cancel_on_tap_outside: false,
        callback: (response) => {
          void (async () => {
            const visitorId = await getFingerprint().catch(() => null);
            const result = await signInWithGoogleOneTap({
              credential: response.credential,
              nonce: rawNonce,
              visitorId,
            });
            if (!result.ok) {
              toast.error(`Google sign-in failed: ${result.error}`);
              return;
            }
            landAfterSignIn(destination);
          })();
        },
      });
      id.prompt();
    })();

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [autoSelect, context, destination, skipped]);

  return null;
}
