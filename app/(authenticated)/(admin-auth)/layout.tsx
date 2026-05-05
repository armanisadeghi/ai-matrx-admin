// app/(authenticated)/(admin-auth)/layout.tsx
// No metadata export — child routes (e.g. /administration/*) set their own titles and favicons.
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsSuperAdmin } from "@/utils/supabase/userSessionData";
import { headers } from "next/headers";

// Admin pages require authentication and cannot be statically generated
export const dynamic = "force-dynamic";

export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Highest-bar gate: only Super Admin can enter the admin route tree by
  // default. Selective lowering happens per-page if/when needed.
  const isSuperAdmin = await checkIsSuperAdmin(supabase, user.id);

  if (!isSuperAdmin) {
    return redirect("/dashboard");
  }

  return <>{children}</>;
}
