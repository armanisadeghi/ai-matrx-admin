// app/(authenticated)/layout.tsx

import {redirect} from 'next/navigation'
import {createClient} from "@/utils/supabase/server";
import {Providers} from "@/app/Providers"

export default async function AuthenticatedLayout({children}: { children: React.ReactNode }) {
    const supabase = createClient();

    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/sign-in");
    }

    return (
        <Providers>
            {children}
        </Providers>
    )
}
