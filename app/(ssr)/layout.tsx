// app/(ssr)/layout.tsx — Static-First SSR Shell Layout
// Server-rendered structural core. Auth resolved server-side via JWT (0ms).
// One DB round-trip (get_ssr_shell_data RPC) fetches everything in parallel:
//   user session, admin status, preferences, AI models, context menu, SMS badge.
// Shell chrome (Header, Sidebar, Dock) = server components, receive data as props.
// Page content wrapped in LiteStoreProvider — store pre-hydrated before first paint.

import "./shell.css";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getSSRShellData } from "@/utils/supabase/ssrShellData";
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

  // Single RPC — fetches everything in parallel inside Postgres:
  // admin status, preferences, AI models, context menu rows, SMS unread count
  let isAdmin = false;
  let initialState: LiteInitialReduxState | undefined;

  if (user) {
    try {
      const shellData = await getSSRShellData(supabase, user.id);
      isAdmin = shellData.is_admin;

      const userData = mapUserData(user, undefined, isAdmin);
      initialState = {
        user: userData,
        userPreferences: shellData.preferences_exists && shellData.preferences
          ? shellData.preferences as Record<string, unknown>
          : undefined,
        modelRegistry: shellData.ai_models.length > 0
          ? { availableModels: shellData.ai_models, lastFetched: Date.now() }
          : undefined,
        contextMenuCache: shellData.context_menu.length > 0
          ? { rows: shellData.context_menu, hydrated: true }
          : undefined,
        sms: shellData.sms_unread_total > 0
          ? { unreadTotal: shellData.sms_unread_total }
          : undefined,
      };
    } catch {
      // Fallback: admin=false, store starts empty. Non-critical — page still renders.
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
