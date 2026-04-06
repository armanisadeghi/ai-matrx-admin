import "@/styles/shell.css";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from "@/utils/userDataMapper";
import { getUserSessionData } from "@/utils/supabase/userSessionData";
import { getEmptyGlobalCache } from "@/utils/schema/schema-processing/emptyGlobalCache";
import { InitialReduxState } from "@/types/reduxTypes";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import type { Json } from "@/types/database.types";
import { initializeUserPreferencesState } from "@/lib/redux/slices/userPreferencesSlice";
import { setGlobalUserIdAndToken } from "@/lib/globalState";
import Sidebar from "@/features/shell/components/sidebar/Sidebar";
import Header from "@/features/shell/components/header/Header";
import MobileDock from "@/features/shell/components/dock/MobileDock";
import MobileSideSheet from "@/features/shell/components/mobile-sheet/MobileSideSheet";
import GlassPortal from "@/features/shell/components/GlassPortal";
import NavActiveSync from "@/features/shell/components/NavActiveSync";
import VisualViewportSync from "@/features/shell/components/VisualViewportSync";
import DeferredIslands from "@/features/shell/islands/DeferredIslands";

const emptyGlobalCache = getEmptyGlobalCache();

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialReduxState: InitialReduxState;
  let avatarUrl: string | undefined;
  let displayName: string | undefined;

  if (user) {
    const [
      {
        data: { session },
      },
      sessionData,
    ] = await Promise.all([
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
        preferences: defaultUserPreferences as unknown as Json,
      });
      userPreferences = initializeUserPreferencesState(
        defaultUserPreferences,
        true,
      );
    } else {
      userPreferences = initializeUserPreferencesState(
        sessionData.preferences || {},
        true,
      );
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
    const guestUserData = mapUserData(null, undefined, false);
    const userPreferences = initializeUserPreferencesState(
      defaultUserPreferences,
      true,
    );

    initialReduxState = {
      user: guestUserData,
      testRoutes: [],
      userPreferences,
      globalCache: emptyGlobalCache,
    };
  }

  return (
    <Providers initialReduxState={initialReduxState}>
      <div className="shell-root" data-pathname={pathname}>
        <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />
        <input type="checkbox" id="shell-user-menu" aria-hidden="true" />
        <input type="checkbox" id="shell-panel-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-panel-mobile" aria-hidden="true" />

        <Sidebar pathname={pathname} />
        <Header avatarUrl={avatarUrl} name={displayName} />

        <main className="shell-main">{children}</main>

        <MobileSideSheet />
      </div>

      <GlassPortal>
        <MobileDock />
      </GlassPortal>

      <NavActiveSync />
      <VisualViewportSync />
      <DeferredIslands />
    </Providers>
  );
}
