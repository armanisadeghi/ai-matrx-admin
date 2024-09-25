// File: app/(authenticated)/layout.tsx

import { redirect } from 'next/navigation';
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/Providers";
import { mapUserData } from '@/utils/userDataMapper';

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
    }

    const userData = mapUserData(user);

    return (
        <Providers initialReduxState={{ user: userData }}>
            {children}
        </Providers>
    );
}
