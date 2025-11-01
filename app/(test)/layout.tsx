// app/(test)/layout.tsx

import {redirect} from 'next/navigation';
import {createClient} from "@/utils/supabase/server";
import {Providers} from "@/app/Providers";
import {mapUserData} from '@/utils/userDataMapper';
import {LayoutWithSidebar} from "@/components/layout/MatrxLayout";
import {appSidebarLinks, adminSidebarLinks} from "@/constants";
import {getTestDirectories} from '@/utils/directoryStructure';
import {InitialReduxState} from "@/types/reduxTypes";
import {ClientDebugWrapper} from '@/components/admin/ClientDebugWrapper';
import NavigationLoader from "@/components/loaders/NavigationLoader";
import {headers} from 'next/headers';
import {LayoutProvider} from '@/providers/layout/LayoutProvider';
import {ModuleLayout} from "@/providers/layout/ModuleLayout";
import { generateClientGlobalCache, initializeSchemaSystem } from '@/utils/schema/schema-processing/processSchema';

const schemaSystem = initializeSchemaSystem();
const clientGlobalCache = generateClientGlobalCache();

export default async function AuthenticatedLayout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const supabase = await createClient();
    const headersList = await headers();
    const viewport = headersList.get('viewport-width') || '1024';
    const isMobile = Number(viewport) < 768;

    const layoutProps = {
        primaryLinks: appSidebarLinks,
        secondaryLinks: adminSidebarLinks,
        initialOpen: !isMobile ? false : false,
        uniqueId: 'matrix-layout-container',
        isAdmin: false,
    };

    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        // Get the current path from headers to preserve the intended destination
        const pathname = headersList.get("x-pathname") || "/dashboard";
        const searchParams = headersList.get("x-search-params") || "";
        const fullPath = searchParams ? `${pathname}${searchParams}` : pathname;
        
        return redirect(`/login?redirectTo=${encodeURIComponent(fullPath)}`);
    }

    const userData = mapUserData(user);
    const testDirectories = await getTestDirectories();

    const {data: preferences, error} = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userData.id)
        .single();

    if (error) {
        console.error('Error loading preferences from Supabase:', error);
    }

    const initialReduxState: InitialReduxState = {
        user: userData,
        testRoutes: testDirectories,
        userPreferences: preferences?.preferences || {},
        globalCache: clientGlobalCache,
    };


    const mainSidebar = (
        <div>
            Sample Content
        </div>
    );

    const defaultSections = [
        {
            type: 'content' as const,
            content: mainSidebar,
            defaultSize: 8,
            collapsible: true,
        },
        {
            type: 'content' as const,
            content: children,
            defaultSize: 92,
        },
    ];

    return (
        <Providers initialReduxState={initialReduxState}>
            <LayoutWithSidebar {...layoutProps}>
                <NavigationLoader/>
                <LayoutProvider
                    initialOptions={{
                        header: {
                            show: true,
                            menuItems: [],
                        },
                        mainSidebar: {
                            show: true,
                            width: 250,
                        },
                    }}
                >
                    <ModuleLayout sections={defaultSections}/>
                </LayoutProvider>
                <ClientDebugWrapper user={userData}/>
            </LayoutWithSidebar>
        </Providers>
    );
}
