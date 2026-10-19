// The Google One Tap prompt's machinery, loaded by GoogleOneTap.tsx through one import() after the
// page is idle. Asks only a signed-out visitor; a signed-in one (not anonymous) is never prompted.

import { getClientClaimsUserCached } from "@/utils/supabase/clientClaimsCache";
import { getFingerprint } from "@/lib/services/fingerprint-service";
import { toast } from "@/lib/toast";
import { loadGoogleIdentityId } from "@/providers/google-provider/googleIdentityId";
import { signInWithGoogleOneTap } from "./actions";
import { landAfterSignIn } from "./landAfterSignIn";
import type { GoogleOneTapProps } from "./GoogleOneTap";

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function runOneTapPrompt({
  clientId,
  autoSelect,
  context,
  landingRedirectTo,
  isCancelled,
}: {
  clientId: string;
  autoSelect: boolean;
  context: NonNullable<GoogleOneTapProps["context"]>;
  landingRedirectTo: string | null;
  isCancelled: () => boolean;
}): Promise<void> {
  const { data } = await getClientClaimsUserCached();
  const user = data.user as { is_anonymous?: boolean } | null;
  if (isCancelled() || (user && user.is_anonymous !== true)) return;

  if (!(await loadGoogleIdentityId()) || isCancelled()) {
    console.warn("[one-tap] Google's sign-in script did not load; the sign-in buttons remain.");
    return;
  }
  const id = window.google?.accounts?.id;
  if (!id) return;

  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);
  if (isCancelled()) return;

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
          ...(landingRedirectTo !== null ? { landing: { redirectTo: landingRedirectTo || null } } : {}),
        });
        if (!result.ok) {
          // An automatic sign-in that failed must not fail again on every page load.
          window.google?.accounts?.id?.disableAutoSelect();
          toast.error(`Google sign-in failed: ${result.error}`);
          return;
        }
        landAfterSignIn(result.destination ?? undefined);
      })();
    },
  });
  id.prompt();
}
