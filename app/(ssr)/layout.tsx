// app/(ssr)/layout.tsx — Static-First SSR Shell Layout
// Server-rendered structural core. Auth + preferences resolved server-side.
// Shell chrome (Header, Sidebar, Dock) = server components, receive data as props.
// Page content wrapped in LiteStoreProvider for client islands to read user/prefs/etc.

import "./shell.css";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUserSessionData } from "@/utils/supabase/userSessionData";
import { mapUserData } from "@/utils/userDataMapper";
import Sidebar from "./_components/Sidebar";
import Header from "./_components/Header";
import MobileDock from "./_components/MobileDock";
import MobileSideSheet from "./_components/MobileSideSheet";
import ThemeScript from "./_components/ThemeScript";
import SSRShellProviders from "./_components/SSRShellProviders";
import type { LiteInitialReduxState } from "@/types/reduxTypes";

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function SSRLayout({ children }: { children: React.ReactNode }) {
  // Resolve auth server-side — no client-side fetch needed
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Extract display name, email, and avatar from user metadata (for shell chrome props)
  let authUser: { name: string; email?: string; avatarUrl?: string } | null = null;
  if (user) {
    const meta = user.user_metadata ?? {};
    const name =
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      user.email?.split("@")[0] ||
      "User";
    const avatarUrl = meta.avatar_url || meta.picture || undefined;
    authUser = { name, email: user.email, avatarUrl };
  }

  // Fetch admin status + preferences in a single RPC call
  let isAdmin = false;
  let initialState: LiteInitialReduxState | undefined;

  if (user) {
    try {
      const sessionData = await getUserSessionData(supabase, user.id);
      isAdmin = sessionData.isAdmin;

      // Build lite store initial state — pre-populated at hydration time
      const userData = mapUserData(user, undefined, isAdmin);
      initialState = {
        user: userData,
        userPreferences: sessionData.preferencesExist ? sessionData.preferences : undefined,
      };
    } catch {
      // Fallback: admin=false, no preferences. Store starts empty.
    }
  }

  // Get current pathname for active route detection
  const headersList = await headers();
  const fullUrl = headersList.get("x-url") || headersList.get("x-invoke-path") || "";
  const pathname = headersList.get("x-pathname") || new URL(fullUrl || "http://localhost/ssr/dashboard").pathname;

  return (
    <>
      <ThemeScript />

      <div className="shell-root">
        {/* Hidden checkboxes for CSS-only state management */}
        <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />

        {/* Desktop Sidebar — server component */}
        <Sidebar pathname={pathname} isAdmin={isAdmin} />

        {/* Header — server component, completely transparent container */}
        <Header user={authUser} isAdmin={isAdmin} />

        {/* Main Content — LiteStoreProvider wraps only page content */}
        <main className="shell-main">
          <SSRShellProviders initialState={initialState}>
            {children}
          </SSRShellProviders>
        </main>

        {/* Mobile Bottom Dock — client component, uses usePathname() */}
        <MobileDock />

        {/* Mobile Off-canvas Side Sheet — server component */}
        <MobileSideSheet pathname={pathname} isAdmin={isAdmin} />
      </div>
    </>
  );
}
