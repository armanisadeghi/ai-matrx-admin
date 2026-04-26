// app/(authenticated)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from "@/utils/userDataMapper";
import {
  appSidebarLinks,
  adminSidebarLinks,
} from "@/constants/navigation-links";
import { checkIsUserAdmin } from "@/utils/supabase/userSessionData";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState } from "@/types/reduxTypes";
import NavigationLoader from "@/components/loaders/NavigationLoader";
import { headers } from "next/headers";
// Phase 4 PR 4.C: removed `setGlobalUserIdAndToken` import — `lib/globalState.ts`
// is deleted in this PR. The Redux preloaded state below carries the user data;
// `lib/sync/identity::attachStore` (called from StoreProvider) wires the
// reactive identity source so non-React consumers see the current state.
import ResponsiveLayout from "@/components/layout/new-layout/ResponsiveLayout";

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

  // Phase 3: admin check is now a narrow single-row lookup; preferences
  // hydration has moved to the client-side `userPreferencesPolicy` cold-boot
  // path. No preloadedState for userPreferences and no server-side row
  // insert — the first debounced `remote.write` upsert creates the row.
  const [
    {
      data: { session },
    },
    isAdmin,
  ] = await Promise.all([
    supabase.auth.getSession(),
    checkIsUserAdmin(supabase, user.id).catch((err) => {
      console.error("checkIsUserAdmin failed, defaulting to false:", err);
      return false;
    }),
  ]);
  const accessToken = session?.access_token;
  const userData = mapUserData(user, accessToken, isAdmin);

  const layoutProps = {
    primaryLinks: appSidebarLinks,
    secondaryLinks: isAdmin ? adminSidebarLinks : [],
    initialOpen: !isMobile ? false : false,
    uniqueId: "matrix-layout-container",
    isAdmin: isAdmin,
    serverIsMobile: isMobile,
  };

  const testDirectories: string[] = [];

  const initialReduxState: InitialReduxState = {
    user: userData,
    testRoutes: testDirectories,
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
