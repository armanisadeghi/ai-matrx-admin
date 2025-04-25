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
// import AdminIndicatorWrapper from "@/components/admin/controls/AdminIndicatorWrapper";

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

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const headersList = await headers();
    const viewport = headersList.get("viewport-width") || "1024";
    const isMobile = Number(viewport) < 768;
    const layoutProps = {
        primaryLinks: appSidebarLinks,
        secondaryLinks: adminSidebarLinks,
        initialOpen: !isMobile ? false : false,
        uniqueId: "matrix-layout-container",
    };
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return redirect("/login");
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    const userData = mapUserData(user, accessToken);
    setGlobalUserIdAndToken(userData.id, accessToken);
    const testDirectories = [];

    const { data: preferences, error } = await supabase.from("user_preferences").select("preferences").eq("user_id", userData.id).single();
    if (error) {
        console.error("Error loading preferences from Supabase:", error);
    }
    const initialReduxState: InitialReduxState = {
        user: userData,
        testRoutes: testDirectories,
        userPreferences: preferences?.preferences || {},
        globalCache: clientGlobalCache,
    };

    return (
        <Providers initialReduxState={initialReduxState}>
            <SocketInitializer />
            <LayoutWithSidebar {...layoutProps}>
                <NavigationLoader />
                {children}
                {/* <AdminIndicatorWrapper /> */}
            </LayoutWithSidebar>
        </Providers>
    );
}
