import "./shell.css";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from "@/utils/userDataMapper";
import { getUserSessionData } from "@/utils/supabase/userSessionData";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState } from "@/types/reduxTypes";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import { initializeUserPreferencesState } from "@/lib/redux/slices/userPreferencesSlice";
import { setGlobalUserIdAndToken } from "@/lib/globalState";
import Sidebar from "./_components/Sidebar";
import Header from "./_components/Header";
import MobileDock from "./_components/MobileDock";
import MobileSideSheet from "./_components/MobileSideSheet";
import DevPerfOverlayIsland from "./_components/DevPerfOverlayIsland";
import GlassPortal from "./_components/GlassPortal";
import NavActiveSync from "./_components/NavActiveSync";
import VisualViewportSync from "./_components/VisualViewportSync";
import AdminIndicatorIsland from "./_components/AdminIndicatorIsland";
import AdminNavInjector from "./_components/AdminNavInjector";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AppleKeyExpiryBanner from "@/components/admin/AppleKeyExpiryBanner";
import { DebugIndicatorManager } from "@/components/debug/DebugIndicatorManager";
import { CanvasSideSheet } from "@/features/canvas/core/CanvasSideSheet";
import LazySocketInitializer from "@/lib/redux/socket-io/connection/LazySocketInitializer";
import LazyMessagingIsland from "./_components/LazyMessagingIsland";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";

const emptyGlobalCache = getEmptyGlobalCache();

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function SSRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/ssr";

  // getUser() validates the JWT — no redirect for guests, they get limited UI
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialReduxState: InitialReduxState;
  let avatarUrl: string | undefined;
  let displayName: string | undefined;

  if (user) {
    // Authenticated: get session token and preferences in parallel
    const [{ data: { session } }, sessionData] = await Promise.all([
      supabase.auth.getSession(),
      getUserSessionData(supabase, user.id),
    ]);

    const accessToken = session?.access_token;
    const isAdmin = sessionData.isAdmin;
    const userData = mapUserData(user, accessToken, isAdmin);

    setGlobalUserIdAndToken(userData.id, accessToken, isAdmin);

    let userPreferences;
    if (!sessionData.preferencesExist) {
      await supabase.from("user_preferences").insert({
        user_id: userData.id,
        preferences: defaultUserPreferences,
      });
      userPreferences = initializeUserPreferencesState(defaultUserPreferences, true);
    } else {
      userPreferences = initializeUserPreferencesState(sessionData.preferences || {}, true);
    }

    initialReduxState = {
      user: userData,
      testRoutes: [],
      userPreferences,
      globalCache: emptyGlobalCache,
    };

    avatarUrl = userData.userMetadata.avatarUrl ?? undefined;
    displayName = userData.userMetadata.name ?? userData.email ?? undefined;
  } else {
    // Guest: seed Redux with empty user state, skip all DB calls
    const guestUserData = mapUserData(null, undefined, false);
    const userPreferences = initializeUserPreferencesState(defaultUserPreferences, true);

    initialReduxState = {
      user: guestUserData,
      testRoutes: [],
      userPreferences,
      globalCache: emptyGlobalCache,
    };
  }

  return (
    <Providers initialReduxState={initialReduxState}>
      <AuthSessionWatcher />
      <LazySocketInitializer />
      <AnnouncementProvider />
      <AppleKeyExpiryBanner />
      <AdminNavInjector />

      <div className="shell-root" data-pathname={pathname}>
        <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />
        <input type="checkbox" id="shell-user-menu" aria-hidden="true" />
        <input type="checkbox" id="shell-panel-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-panel-mobile" aria-hidden="true" />

        <Sidebar pathname={pathname} />
        <Header
          avatarUrl={avatarUrl}
          name={displayName}
        />

        <main className="shell-main">{children}</main>

        <MobileSideSheet />
      </div>

      <GlassPortal>
        <MobileDock />
      </GlassPortal>

      <NavActiveSync />
      <VisualViewportSync />
      <DevPerfOverlayIsland />
      <AdminIndicatorIsland />
      <DebugIndicatorManager />
      <CanvasSideSheet />
      <LazyMessagingIsland />
    </Providers>
  );
}
