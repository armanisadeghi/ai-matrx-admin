"use server";

// Google One Tap's sign-in: the browser hands over the ID token Google signed, the session is
// established HERE, inside THE ONE HANDOVER (`lib/guest/session-handover.ts`), so a guest's records
// come with them exactly as they do through the Google button's OAuth round trip. A new Google account
// is created by the same call — One Tap is sign-up and sign-in in one click.
//
// Why a server action and not `supabase.auth.signInWithIdToken` in the browser: the guest claim reads
// the guest cookie and writes through the service lane, both server-only, and `check:session-handover`
// refuses any session replacement outside `handOverSession`. This is the same door password login uses.

import { after } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { handOverSession } from "@/lib/guest/session-handover";
import { ACQUISITION_VISITOR_COOKIE } from "@/lib/product-analytics/user-acquisition";
import { linkAcquisitionToUser } from "@/lib/product-analytics/server/acquisition-persistence";
import { clearPendingSignupEmail } from "@/utils/auth/pending-signup";

export type OneTapSignInResult = { ok: true } | { ok: false; error: string };

export async function signInWithGoogleOneTap(input: {
  credential: string;
  nonce: string;
  visitorId: string | null;
}): Promise<OneTapSignInResult> {
  if (!input.credential || !input.nonce) {
    return { ok: false, error: "Google did not return a sign-in token." };
  }
  const supabase = await createClient();
  // `oauth_callback`: the package's handover vocabulary names the provider-identity path once;
  // an ID token from Google is that same identity, delivered without the redirect.
  const { data, error } = await handOverSession(
    "oauth_callback",
    () =>
      supabase.auth.signInWithIdToken({
        provider: "google",
        token: input.credential,
        nonce: input.nonce,
      }),
    { visitorId: input.visitorId },
  );
  if (error || !data.user) {
    console.error("[one-tap] LOUD: Google ID-token sign-in failed", error);
    return {
      ok: false,
      error: error?.message ?? "Google sign-in did not complete.",
    };
  }

  await clearPendingSignupEmail();

  if (data.user.is_anonymous !== true) {
    const userId = data.user.id;
    const visitor = (await cookies()).get(ACQUISITION_VISITOR_COOKIE)?.value;
    if (visitor && /^[A-Za-z0-9]{16,200}$/.test(visitor)) {
      after(async () => {
        try {
          await linkAcquisitionToUser(visitor, userId);
        } catch (linkError) {
          console.error("[one-tap] LOUD: sign-in succeeded but acquisition linking failed", linkError);
        }
      });
    }
  }
  return { ok: true };
}
