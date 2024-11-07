// app/(authenticated)/DynamicLayout.tsx

import {redirect} from 'next/navigation';
import {createClient} from "@/utils/supabase/server";
import {Providers} from "@/app/Providers";
import {mapUserData} from '@/utils/userDataMapper';
import {LayoutWithSidebar} from "@/components/layout/MatrixLayout";
import {appSidebarLinks, adminSidebarLinks} from "@/constants";
import {generateClientGlobalCache, initializeSchemaSystem} from '@/utils/schema/precomputeUtil';
import {getTestDirectories} from '@/utils/directoryStructure';
import {InitialReduxState} from "@/types/reduxTypes";
import { ClientDebugWrapper } from '@/components/admin/ClientDebugWrapper';
import NavigationLoader from "@/components/loaders/NavigationLoader";

const schemaSystem = initializeSchemaSystem();
const clientGlobalCache = generateClientGlobalCache();


export default async function AuthenticatedLayout({
                                                      children
                                                  }: {
    children: React.ReactNode
}) {
    const supabase = createClient();
    const layoutProps = {primaryLinks: appSidebarLinks, secondaryLinks: adminSidebarLinks, initialOpen: false};

    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
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
        globalCache: clientGlobalCache
    }

    return (
        <Providers initialReduxState={initialReduxState}>
            <LayoutWithSidebar {...layoutProps}>
                <NavigationLoader />
                {children}
                <ClientDebugWrapper user={userData} />
            </LayoutWithSidebar>
        </Providers>
    );
}



/*
// app/layout.tsx or app/page.tsx

import { useSocketInitialization } from '@/lib/hooks/useSocketInitialization';

export default function AppLayout({ children }) {
    useSocketInitialization();

    return <>{children}</>;
}
*/


/*
// In a component or saga

import { useDispatch } from 'react-redux';

function MyComponent() {
    const dispatch = useDispatch();

    const handleClick = () => {
        dispatch({ type: 'EMIT_entity/myEntity/action', payload: { data: 'test' } });
    };

    return <button onClick={handleClick}>Send Socket Event</button>;
}
*/



/*
// In your entity reducer

import { createSlice } from '@reduxjs/toolkit';

const myEntitySlice = createSlice({
    name: 'myEntity',
    initialState: {},
    reducers: {
        updateMyEntity(state, action) {
            // Update state with payload
        },
    },
    extraReducers: (builder) => {
        builder.addCase('SOCKET_entity/myEntity/update', (state, action) => {
            // Handle socket update
        });
    },
});

export default myEntitySlice.reducer;
*/

/*

// types/socketTypes.ts

export interface SocketEventPayload {
    eventName: string;
    args: any[];
}
*/
