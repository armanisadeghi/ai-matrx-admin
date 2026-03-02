import "./shell.css";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getSSRShellData } from "@/utils/supabase/ssrShellData";
import { mapUserData } from "@/utils/userDataMapper";
import { createServerTimer } from "@/utils/performance/serverTiming";
import Sidebar from "./_components/Sidebar";
import Header from "./_components/Header";
import MobileDock from "./_components/MobileDock";
import MobileSideSheet from "./_components/MobileSideSheet";
import ThemeScript from "./_components/ThemeScript";
import SSRShellProviders from "./_components/SSRShellProviders";
import DevPerfOverlay from "./_components/DevPerfOverlay";
import type { LiteInitialReduxState } from "@/types/reduxTypes";

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function SSRLayout({ children }: { children: React.ReactNode }) {
  const timer = createServerTimer();

  const supabase = await timer.measure('createClient', () => createClient());
  const { data: { user } } = await timer.measure('auth.getUser', () => supabase.auth.getUser());

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

  let isAdmin = false;
  let initialState: LiteInitialReduxState | undefined;

  if (user) {
    try {
      const shellData = await timer.measure('rpc:shell_data', () => getSSRShellData(supabase, user.id), 'get_ssr_shell_data RPC');
      isAdmin = shellData.is_admin;

      timer.mark('state-mapping');
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

  const headersList = await timer.measure('headers', () => headers());
  const fullUrl = headersList.get("x-url") || headersList.get("x-invoke-path") || "";
  const pathname = headersList.get("x-pathname") || new URL(fullUrl || "http://localhost/ssr/dashboard").pathname;

  timer.mark('render-start');
  timer.done('(ssr) Layout');

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

      <DevPerfOverlay />
    </>
  );
}
