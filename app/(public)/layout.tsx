import React from "react";

import { PublicHeader } from "@/components/matrx/PublicHeader";
import { PublicFooter } from "@/components/matrx/PublicFooter";
import { GoogleOneTapMount } from "@/features/auth/one-tap/GoogleOneTapMount";
import { PublicAppRoot } from "@/features/public-shell/PublicAppRoot";
import { getServerAuth } from "@/utils/supabase/getServerAuth";
// The chat surface manifests for the SERVER layer (app/Providers.tsx used to bring this in here;
// Providers now loads on the client, behind PublicAppRoot's one edge). Isomorphic, ships no client code.
import "@/providers/chat-surface-manifests";

// PUBLIC-LAYOUT-PERF (2026-10-19): this layout's static client graph is the first load of every
// marketing page. It must stay light: the app Providers, the canvas column and the Redux header
// islands load through PublicAppRoot's ONE dynamic edge — for a signed-in visitor, a route off the
// light list, or on demand (features/public-shell/publicTier.ts). Never import them here.
// Guard: app/__tests__/public-layout-stays-light.test.ts

const ONE_TAP_SKIP_PREFIXES = [
  "/unsubscribe",
  "/appointment-reminder",
  "/app_callback",
  "/l/",
  "/r/",
  "/sms",
  // A share link mounts its own prompt with the owning organization's choice (s/[token]/page.tsx).
  "/s/",
];

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A person with an account (not an anonymous guest) gets the full tree from the first byte. An
  // unreachable verdict is not "signed out": it gets the full tree too.
  const auth = await getServerAuth();
  const signedIn = auth.authUnavailable || (auth.isAuthenticated && !auth.isGuest);
  return (
    <>
      <PublicAppRoot signedIn={signedIn}>
        <div data-public-layout className="flex min-h-dvh flex-col">
          <PublicHeader />
          <main data-public-main className="min-h-0 flex-1 overflow-x-hidden">
            {children}
          </main>
          <PublicFooter />
        </div>
      </PublicAppRoot>
      {/* Google One Tap for signed-out visitors — marketing and shared pages alike. Links that
          answer one errand (unsubscribe, a reminder, a short link) never prompt. */}
      <GoogleOneTapMount skipPrefixes={ONE_TAP_SKIP_PREFIXES} />
    </>
  );
}
