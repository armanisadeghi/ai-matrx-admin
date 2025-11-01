// app/(authenticated)/(admin-auth)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { mapUserData } from "@/utils/userDataMapper";
import { isAdminUser } from "@/config/admin.config";
import { headers } from "next/headers";

// Admin pages require authentication and cannot be statically generated
export const dynamic = 'force-dynamic';


export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        // Get the current path from headers to preserve the intended destination
        const headersList = await headers();
        const pathname = headersList.get("x-pathname") || "/dashboard";
        const searchParams = headersList.get("x-search-params") || "";
        const fullPath = searchParams ? `${pathname}${searchParams}` : pathname;
        
        return redirect(`/login?redirectTo=${encodeURIComponent(fullPath)}`);
    }

    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    const isAdmin = isAdminUser(user.id);

    if (!isAdmin) {
        return redirect("/dashboard");
    }


    return (
        <>
            {children}
        </>
    );
}
