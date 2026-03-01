// app/(ssr)/layout.tsx — Static-First SSR Shell Layout
// 100% server-rendered structural core. Zero client-side logic on initial load.
// Auth resolved server-side via Supabase. Shell state driven by CSS :has() selectors.

import "./shell.css";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import Sidebar from "./_components/Sidebar";
import Header from "./_components/Header";
import MobileDock from "./_components/MobileDock";
import MobileSideSheet from "./_components/MobileSideSheet";
import ThemeScript from "./_components/ThemeScript";

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function SSRLayout({ children }: { children: React.ReactNode }) {
  // Resolve auth server-side — no client-side fetch needed
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Extract display name, email, and avatar from user metadata
  let authUser: { name: string; email?: string; avatarUrl?: string } | null = null;
  if (user) {
    const meta = user.user_metadata ?? {};
    const name =
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      user.email?.split("@")[0] ||
      "User";
    const avatarUrl = meta.avatar_url || meta.picture || undefined;
    authUser = { name, email: user.email, avatarUrl };
  }

  // Resolve admin status server-side
  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("user_status")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();
    isAdmin = data?.is_admin ?? false;
  }

  // Get current pathname for active route detection
  const headersList = await headers();
  const fullUrl = headersList.get("x-url") || headersList.get("x-invoke-path") || "";
  // Next.js 16 provides the pathname via x-pathname or we parse from referer/url
  const pathname = headersList.get("x-pathname") || new URL(fullUrl || "http://localhost/ssr/dashboard").pathname;

  return (
    <>
      <ThemeScript />

      <div className="shell-root">
        {/* Hidden checkboxes for CSS-only state management */}
        <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />

        {/* Desktop Sidebar */}
        <Sidebar pathname={pathname} isAdmin={isAdmin} />

        {/* Header — Completely transparent container */}
        <Header user={authUser} isAdmin={isAdmin} />

        {/* Main Content — Independent scroll context */}
        <main className="shell-main">
          {children}
        </main>

        {/* Mobile Bottom Dock */}
        <MobileDock pathname={pathname} />

        {/* Mobile Off-canvas Side Sheet */}
        <MobileSideSheet pathname={pathname} isAdmin={isAdmin} />
      </div>
    </>
  );
}
