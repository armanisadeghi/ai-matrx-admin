// app/(authenticated)/(admin-auth)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { mapUserData } from "@/utils/userDataMapper";

const adminIds = ["4cf62e4e-2679-484f-b652-034e697418df", "8f7f17ba-935b-4967-8105-7c6b554f41f1", "6555aa73-c647-4ecf-8a96-b60e315b6b18"];

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
