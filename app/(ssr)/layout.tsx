import "./shell.css";
import { Suspense } from "react";
import { headers } from "next/headers";
import { createClient, getUser } from "@/utils/supabase/server";
import { createServerTimer } from "@/utils/performance/serverTiming";
import Sidebar from "./_components/Sidebar";
import Header from "./_components/Header";
import MobileDock from "./_components/MobileDock";
import MobileSideSheet from "./_components/MobileSideSheet";
import ThemeScript from "./_components/ThemeScript";
import SSRShellProviders from "./_components/SSRShellProviders";
import DeferredShellData from "./_components/DeferredShellData";
import DevPerfOverlay from "./_components/DevPerfOverlay";

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function SSRLayout({ children }: { children: React.ReactNode }) {
  const timer = createServerTimer();

  const supabase = await timer.measure('createClient', () => createClient());
  const user = await timer.measure('auth.getUser', () => getUser());

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

  const headersList = await timer.measure('headers', () => headers());
  const fullUrl = headersList.get("x-url") || headersList.get("x-invoke-path") || "";
  const pathname = headersList.get("x-pathname") || new URL(fullUrl || "http://localhost/ssr/dashboard").pathname;

  timer.mark('render-start');
  timer.done('(ssr) Layout');

  return (
    <>
      <ThemeScript />

      <div className="shell-root">
        <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
        <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />

        {/* Shell chrome — renders immediately with isAdmin=false.
            Admin nav items appear once DeferredShellData streams in. */}
        <Sidebar pathname={pathname} isAdmin={false} />
        <Header user={authUser} isAdmin={false} />

        <main className="shell-main">
          <SSRShellProviders>
            {/* RPC data streams in via Suspense — store hydrates without blocking paint */}
            <Suspense fallback={null}>
              {user && <DeferredShellData userId={user.id} user={user} />}
            </Suspense>
            {children}
          </SSRShellProviders>
        </main>

        <MobileDock />
        <MobileSideSheet pathname={pathname} isAdmin={false} />
      </div>

      <DevPerfOverlay />
    </>
  );
}
