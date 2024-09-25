// File: app/(authenticated)/layout.tsx

import { redirect } from 'next/navigation';
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from '@/utils/userDataMapper';
import { promises as fs } from 'fs';
import path from 'path';

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

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
    }

    const userData = mapUserData(user);
    const testDirectories = await getTestDirectories();


    return (
        <Providers initialReduxState={{
            user: userData,
            testRoutes: testDirectories
        }}>
            {children}
        </Providers>
    );
}
