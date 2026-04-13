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

const emptyGlobalCache = getEmptyGlobalCache();

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
  let sessionData;
  try {
    sessionData = await getUserSessionData(supabase, user.id);
  } catch (e) {
    console.error("Failed to fetch session data, using defaults:", e);
    sessionData = { isAdmin: false, preferences: {}, preferencesExist: false };
  }
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
      <ResponsiveLayout {...layoutProps}>
        <NavigationLoader />
        {children}
      </ResponsiveLayout>
    </Providers>
  );
}
