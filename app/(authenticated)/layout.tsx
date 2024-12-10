import {redirect} from 'next/navigation';
import {createClient} from "@/utils/supabase/server";
import {Providers} from "@/app/Providers";
import {mapUserData} from '@/utils/userDataMapper';
import {LayoutWithSidebar} from "@/components/layout/MatrixLayout";
// import {LayoutWithSidebar} from "@/components/layout/extras/layoutNew";
import {appSidebarLinks, adminSidebarLinks} from "@/constants";
import {generateClientGlobalCache, initializeSchemaSystem} from '@/utils/schema/precomputeUtil';
import {getTestDirectories} from '@/utils/directoryStructure';
import {InitialReduxState} from "@/types/reduxTypes";
import {ClientDebugWrapper} from '@/components/admin/ClientDebugWrapper';
import NavigationLoader from "@/components/loaders/NavigationLoader";
import {headers} from 'next/headers';

const schemaSystem = initializeSchemaSystem();
const clientGlobalCache = generateClientGlobalCache();

export default async function AuthenticatedLayout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    const supabase = await createClient(); // Await the async function to get the Supabase client
    const headersList = await headers();
    const viewport = headersList.get('viewport-width') || '1024';
    const isMobile = Number(viewport) < 768;

    const layoutProps = {
        primaryLinks: appSidebarLinks,
        secondaryLinks: adminSidebarLinks,
        initialOpen: !isMobile
    };

    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
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

    return (
        <Providers initialReduxState={initialReduxState}>
            <LayoutWithSidebar {...layoutProps}>
                <NavigationLoader/>
                    {children}
                <ClientDebugWrapper user={userData}/>
            </LayoutWithSidebar>
        </Providers>
    );
}
