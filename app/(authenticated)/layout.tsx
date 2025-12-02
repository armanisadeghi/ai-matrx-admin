// app/(authenticated)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from "@/utils/userDataMapper";
import { appSidebarLinks, adminSidebarLinks } from "@/constants";
import { getUserSessionData } from "@/utils/supabase/userSessionData";
import { generateClientGlobalCache, initializeSchemaSystem } from "@/utils/schema/schema-processing/processSchema";
import { InitialReduxState } from "@/types/reduxTypes";
import NavigationLoader from "@/components/loaders/NavigationLoader";
import { headers } from "next/headers";
import { setGlobalUserIdAndToken } from "@/lib/globalState";
import SocketInitializer from "@/lib/redux/socket-io/connection/SocketInitializer";
import AdminIndicatorWrapper from "@/components/admin/controls/AdminIndicatorWrapper";
import { DebugIndicatorManager } from "@/components/debug/DebugIndicatorManager";
import ResponsiveLayout from "@/components/layout/new-layout/ResponsiveLayout";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import { initializeUserPreferencesState } from "@/lib/redux/slices/userPreferencesSlice";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import TokenRefreshInitializer from "@/components/auth/TokenRefreshInitializer";
import { CanvasSideSheet } from "@/features/canvas/core/CanvasSideSheet";

const schemaSystem = initializeSchemaSystem();
const clientGlobalCache = generateClientGlobalCache();

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const headersList = await headers();
    const viewport = headersList.get("viewport-width") || "1024";
    const isMobile = Number(viewport) < 768;

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        // Get the current path from headers to preserve the intended destination
        const pathname = headersList.get("x-pathname") || "/dashboard";
        const searchParams = headersList.get("x-search-params") || "";
        const fullPath = searchParams ? `${pathname}${searchParams}` : pathname;
        
        return redirect(`/login?redirectTo=${encodeURIComponent(fullPath)}`);
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

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
    };

    setGlobalUserIdAndToken(userData.id, accessToken, isAdmin);
    const testDirectories = [];

    // Handle user preferences - create defaults for new users if needed
    let userPreferences;

    if (!sessionData.preferencesExist) {
        // No preferences found - create default preferences for new user
        const { error: insertError } = await supabase.from("user_preferences").insert({
            user_id: userData.id,
            preferences: defaultUserPreferences,
        });

        if (insertError) {
            console.error("Error creating default preferences:", insertError);
        } else {
            console.log("✅ Created default preferences for new user");
        }

        userPreferences = initializeUserPreferencesState(defaultUserPreferences, true);
    } else {
        // Preferences loaded successfully from the combined query
        userPreferences = initializeUserPreferencesState(sessionData.preferences || {}, true);
    }

    const initialReduxState: InitialReduxState = {
        user: userData,
        testRoutes: testDirectories,
        userPreferences: userPreferences,
        globalCache: clientGlobalCache,
    };

    return (
        <Providers initialReduxState={initialReduxState}>
            <SocketInitializer />
            <TokenRefreshInitializer />
            <AnnouncementProvider />
            <ResponsiveLayout {...layoutProps}>
                <NavigationLoader />
                {children}
                <AdminIndicatorWrapper />
                <DebugIndicatorManager />
            </ResponsiveLayout>
            {/* Global Canvas Side Sheet - Available everywhere (routes, modals, sheets) */}
            <CanvasSideSheet />
        </Providers>
    );
}
