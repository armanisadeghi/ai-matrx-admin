// app/(authenticated)/DynamicLayout.tsx

import { redirect } from 'next/navigation';
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from '@/utils/userDataMapper';
import { promises as fs } from 'fs';
import path from 'path';
import { LayoutWithSidebar } from "@/components/layout/MatrixLayout";
import {appSidebarLinks, adminSidebarLinks} from "@/constants";
import { generateClientSchema, initializeSchemaSystem } from '@/utils/schema/precomputeUtil';

// Initialize schema at module level for caching across requests
const schemaSystem = initializeSchemaSystem();
const clientSchema = generateClientSchema();

async function getTestDirectories(): Promise<string[]> {
    const currentDir = path.dirname(new URL(import.meta.url).pathname.slice(1));
    const testsPath = path.join(currentDir, 'tests');

    try {
        const entries = await fs.readdir(testsPath, { withFileTypes: true });
        return entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => `/tests/${dirent.name}`);
    } catch (error) {
        return [];
    }
}

export default async function AuthenticatedLayout({
    children
}: {
    children: React.ReactNode
}) {
    const supabase = createClient();
    const layoutProps = { primaryLinks: appSidebarLinks, secondaryLinks: adminSidebarLinks, initialOpen: false };

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
    }

    const userData = mapUserData(user);
    const testDirectories = await getTestDirectories();

    // Load user preferences
    const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userData.id)
        .single();

    if (error) {
        console.error('Error loading preferences from Supabase:', error);
    }

    return (
        <Providers initialReduxState={{
            user: userData,
            testRoutes: testDirectories,
            userPreferences: preferences?.preferences || {},
            schema: clientSchema
        }}>
            <LayoutWithSidebar {...layoutProps}>
                    {children}
            </LayoutWithSidebar>
        </Providers>
);
}
