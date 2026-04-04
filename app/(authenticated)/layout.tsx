// app/(authenticated)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from "@/utils/userDataMapper";
import {
  appSidebarLinks,
  adminSidebarLinks,
} from "@/constants/navigation-links";
import { getUserSessionData } from "@/utils/supabase/userSessionData";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState } from "@/types/reduxTypes";
import NavigationLoader from "@/components/loaders/NavigationLoader";
import { headers } from "next/headers";
import { setGlobalUserIdAndToken } from "@/lib/globalState";
import ResponsiveLayout from "@/components/layout/new-layout/ResponsiveLayout";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import { initializeUserPreferencesState } from "@/lib/redux/slices/userPreferencesSlice";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";
import { CanvasSideSheet } from "@/features/canvas/core/CanvasSideSheet";
import { DynamicSocketInitializer } from "@/app/(authenticated)/dynamic-imports/DynamicSocketInitializer";
import { DynamicAdminIndicatorWrapper } from "@/app/(authenticated)/dynamic-imports/DynamicAdminIndicatorWrapper";
import { DynamicDebugIndicatorManager } from "@/app/(authenticated)/dynamic-imports/DynamicDebugIndicatorManager";
import { DynamicAnnouncementProvider } from "@/app/(authenticated)/dynamic-imports/DynamicAnnouncementProvider";
import {
  DynamicMessagingInitializer,
  DynamicMessagingSideSheet,
} from "@/app/(authenticated)/dynamic-imports/DynamicMessaging";
import { DynamicAppleKeyExpiryBanner } from "@/app/(authenticated)/dynamic-imports/DynamicAppleKeyExpiryBanner";
import { DynamicVoicePad } from "@/app/(authenticated)/dynamic-imports/DynamicVoicePad";
import { DynamicWindowTray } from "@/app/(authenticated)/dynamic-imports/DynamicWindowTray";

const emptyGlobalCache = getEmptyGlobalCache();
console.warn(
  "[AuthLayout] Booting with empty entity shell — entity system will load on-demand via EntityPack",
);

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const headersList = await headers();
  const viewport = headersList.get("viewport-width") || "0";
  const isMobile = Number(viewport) < 768;

  // getUser() validates the session server-side (network call to Supabase Auth)
  // This is appropriate in a layout since it runs once per page load, not per navigation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy already handles redirecting unauthenticated users to login
  // This is a safety check in case proxy is bypassed somehow
  if (!user) {
    return redirect("/login");
  }

  // Get the access token from the session for API calls
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  // Fetch admin status and preferences in a single efficient query
  const sessionData = await getUserSessionData(supabase, user.id);
  const isAdmin = sessionData.isAdmin;
  const userData = mapUserData(user, accessToken, isAdmin);

  const layoutProps = {
    primaryLinks: appSidebarLinks,
    secondaryLinks: isAdmin ? adminSidebarLinks : [],
    initialOpen: !isMobile ? false : false,
    uniqueId: "matrix-layout-container",
    isAdmin: isAdmin,
    serverIsMobile: isMobile,
  };

  setGlobalUserIdAndToken(userData.id, accessToken, isAdmin);
  const testDirectories = [];

  // Handle user preferences - create defaults for new users if needed
  let userPreferences;

  if (!sessionData.preferencesExist) {
    // No preferences found - create default preferences for new user
    const { error: insertError } = await supabase
      .from("user_preferences")
      .insert({
        user_id: userData.id,
        preferences: defaultUserPreferences,
      });

    if (insertError) {
      console.error("Error creating default preferences:", insertError);
    } else {
      console.log("✅ Created default preferences for new user");
    }

    userPreferences = initializeUserPreferencesState(
      defaultUserPreferences,
      true,
    );
  } else {
    // Preferences loaded successfully from the combined query
    userPreferences = initializeUserPreferencesState(
      sessionData.preferences || {},
      true,
    );
  }

  const initialReduxState: InitialReduxState = {
    user: userData,
    testRoutes: testDirectories,
    userPreferences: userPreferences,
    globalCache: emptyGlobalCache,
  };

  return (
    <Providers initialReduxState={initialReduxState}>
      <DynamicAppleKeyExpiryBanner />
      <AuthSessionWatcher />
      {/* DynamicSocketInitializer disabled — server no longer supports socket.io */}
      <DynamicAnnouncementProvider />
      <ResponsiveLayout {...layoutProps}>
        <NavigationLoader />
        {children}
        <DynamicAdminIndicatorWrapper />
        <DynamicDebugIndicatorManager />
        <DynamicVoicePad />
      </ResponsiveLayout>
      {/* Global Canvas Side Sheet - Available everywhere (routes, modals, sheets) */}
      <CanvasSideSheet />
      {/* Global Messaging System - Side Sheet + Data Loader */}
      <DynamicMessagingInitializer />
      <DynamicMessagingSideSheet />
      {/* Window manager tray — must be outside ResponsiveLayout to avoid transform stacking context */}
      <DynamicWindowTray />
    </Providers>
  );
}
