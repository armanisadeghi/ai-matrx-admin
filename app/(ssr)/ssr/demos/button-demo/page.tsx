// app/(ssr)/ssr/dashboard/page.tsx — Server-rendered dashboard
// 100% server component. No "use client" anywhere in this file.
// Layout wrapper (PageHeader + content div) lives in layout.tsx.

import { createClient } from "@/utils/supabase/server";

import QuickActions from "../../dashboard/components/QuickActions";
import WelcomeCard from "../../dashboard/components/WelcomeCard";
import RecentActivity from "../../dashboard/components/RecentActivity";
import DashboardGrid from "../../dashboard/components/DashboardGrid";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dashboardUser: {
    name: string;
    email?: string;
    avatarUrl?: string;
  } | null = null;
  if (user) {
    const meta = user.user_metadata ?? {};
    dashboardUser = {
      name:
        meta.full_name ||
        meta.name ||
        meta.display_name ||
        user.email?.split("@")[0] ||
        "User",
      email: user.email,
      avatarUrl: meta.avatar_url || meta.picture || undefined,
    };
  }

  return (
    <>
      <section>
        <QuickActions />
      </section>

      <section>
        <DashboardGrid />
      </section>

      <section>
        <RecentActivity />
      </section>

      <WelcomeCard user={dashboardUser} />
    </>
  );
}
