// app/(authenticated)/(admin-auth)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { mapUserData } from "@/utils/userDataMapper";
import { adminIds } from "@/components/layout";

// Admin pages require authentication and cannot be statically generated
export const dynamic = 'force-dynamic';


export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

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

    if (!isAdmin) {
        return redirect("/dashboard");
    }


    return (
        <>
            {children}
        </>
    );
}
