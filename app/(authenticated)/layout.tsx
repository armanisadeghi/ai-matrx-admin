// app/(authenticated)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from "@/utils/userDataMapper";
import { LayoutWithSidebar } from "@/components/layout/MatrxLayout";
import { appSidebarLinks, adminSidebarLinks } from "@/constants";
import { generateClientGlobalCache, initializeSchemaSystem } from "@/utils/schema/schema-processing/processSchema";
import { InitialReduxState } from "@/types/reduxTypes";
import NavigationLoader from "@/components/loaders/NavigationLoader";
import { headers } from "next/headers";
import { setGlobalUserIdAndToken } from "@/lib/globalState";
import SocketInitializer from "@/lib/redux/socket-io/connection/SocketInitializer";
import AdminIndicatorWrapper from "@/components/admin/controls/AdminIndicatorWrapper";
import ResponsiveLayout from "@/components/layout/new-layout/ResponsiveLayout";
import { defaultUserPreferences } from "@/lib/redux/slices/defaultPreferences";
import { initializeUserPreferencesState } from "@/lib/redux/slices/userPreferencesSlice";

const schemaSystem = initializeSchemaSystem();
const clientGlobalCache = generateClientGlobalCache();

async function fetchTestDirectories() {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/test-directories.json`);
        if (!response.ok) {
            console.error(`Failed to fetch test directories: ${response.status} ${response.statusText}`);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching test directories:", error);
        return [];
    }
}

const adminIds = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
  ];

  const newLayout = false;

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const headersList = await headers();
    const viewport = headersList.get("viewport-width") || "1024";
    const isMobile = Number(viewport) < 768;

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return redirect("/login");
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    const userData = mapUserData(user, accessToken);

    const isAdmin = adminIds.includes(userData.id);

    const layoutProps = {
        primaryLinks: appSidebarLinks,
        secondaryLinks: isAdmin ? adminSidebarLinks : [],
        initialOpen: !isMobile ? false : false,
        uniqueId: "matrix-layout-container",
        isAdmin: isAdmin,
    };

    setGlobalUserIdAndToken(userData.id, accessToken, isAdmin);
    const testDirectories = [];

    // Handle user preferences - create defaults for new users
    let userPreferences;
    const { data: preferences, error } = await supabase.from("user_preferences").select("preferences").eq("user_id", userData.id).single();
    
    if (error && error.code === 'PGRST116') {
        // No preferences found - create default preferences for new user
        const defaultPreferences = defaultUserPreferences;

        // Create the preferences record in the database
        const { error: insertError } = await supabase
            .from("user_preferences")
            .insert({
                user_id: userData.id,
                preferences: defaultPreferences
            });

        if (insertError) {
            console.error("Error creating default preferences:", insertError);
            userPreferences = initializeUserPreferencesState(defaultPreferences); // Use helper function
        } else {
            console.log("✅ Created default preferences for new user");
            userPreferences = initializeUserPreferencesState(defaultPreferences); // Use helper function
        }
    } else if (error) {
        // Some other error occurred
        console.error("Error loading preferences from Supabase:", error);
        userPreferences = initializeUserPreferencesState(); // Use helper function with defaults
    } else {
        // Preferences loaded successfully - use helper function to ensure proper structure
        userPreferences = initializeUserPreferencesState(preferences?.preferences || {});
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
            {newLayout ? (
                <ResponsiveLayout {...layoutProps}>
                    <NavigationLoader />
                    {children}
                    <AdminIndicatorWrapper />
                </ResponsiveLayout>
            ) : (
                <LayoutWithSidebar {...layoutProps}>
                    <NavigationLoader />
                    {children}
                    <AdminIndicatorWrapper />
                </LayoutWithSidebar>
            )}
        </Providers>
    );
}
