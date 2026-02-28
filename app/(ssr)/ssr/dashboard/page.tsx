// app/(ssr)/ssr/dashboard/page.tsx — Server-rendered dashboard
// 100% server component. No "use client" anywhere in this file.
// Data fetched server-side where possible, tiny Suspense islands for dynamic data.

import { createClient } from "@/utils/supabase/server";
import DashboardGrid from "./components/DashboardGrid";
import QuickActions from "./components/QuickActions";
import WelcomeCard from "./components/WelcomeCard";
import RecentActivity from "./components/RecentActivity";

export const metadata = {
  title: "Dashboard | AI Matrx",
  description: "Your central hub for all activities and insights",
};

export default async function DashboardPage() {
  // Fetch user data server-side for the welcome card
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let dashboardUser: { name: string; email?: string; avatarUrl?: string } | null = null;
  if (user) {
    const meta = user.user_metadata ?? {};
    dashboardUser = {
      name: meta.full_name || meta.name || meta.display_name || user.email?.split("@")[0] || "User",
      email: user.email,
      avatarUrl: meta.avatar_url || meta.picture || undefined,
    };
  }

  return (
    <div className="flex flex-col gap-5 py-4 pb-8">
      {/* Welcome greeting */}
      <WelcomeCard user={dashboardUser} />

      {/* Quick action cards */}
      <section>
        <h2 className="shell-section-heading">Quick Actions</h2>
        <QuickActions />
      </section>

      {/* App grid — iOS-style icons */}
      <section>
        <h2 className="shell-section-heading">Apps</h2>
        <DashboardGrid />
      </section>

      {/* What's new */}
      <section>
        <h2 className="shell-section-heading">What&apos;s New</h2>
        <RecentActivity />
      </section>
    </div>
  );
}
