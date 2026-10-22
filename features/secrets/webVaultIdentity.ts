"use client";

/**
 * THE website's "Confirm it's you" for `@ai-matrx/vault`, shared by every web
 * surface that shows or sends a secret: the Vault workspace (`WebVault`) and
 * the secure-link sender (`@ai-matrx/sharing src/react/sheet/SecureLinkPanel.tsx`). One
 * identity, one gate (`IdentityGate` / `useConfirmed` from the package) —
 * Google, password or an emailed code, whichever the account uses.
 */
import { createSupabaseIdentity } from "@ai-matrx/vault";
import { performLocalSignOut } from "@/features/shell/auth/useSignOut";
import { loginHref, withAuthDestination, withAuthFlowParams } from "@/utils/auth/auth-destination";
import { supabase } from "@/utils/supabase/client";

const here = () => `${window.location.pathname}${window.location.search}`;

/**
 * "Continue with Google" returns through the site's one sign-in callback (the
 * only return address the auth server accepts), back to this same address. If
 * a DIFFERENT account came back, that session is ended on this device only
 * (the app's device-scoped sign-out) and the sign-in page says why.
 */
export const webVaultIdentity = createSupabaseIdentity(supabase.auth, {
  redirectTo: () => `${window.location.origin}${withAuthDestination("/auth/callback", here())}`,
  onDifferentPerson: async (message) => {
    const to = withAuthFlowParams(loginHref(here()), { error: message });
    try {
      await performLocalSignOut(to);
    } finally {
      // The sign-in page says why, even when a sign-out listener elsewhere in the app threw.
      window.location.href = to;
    }
  },
});

/** The site's sign-in, back to this address after: offered when the session has ended. */
export const webVaultSignIn = () => window.location.assign(loginHref(here()));
