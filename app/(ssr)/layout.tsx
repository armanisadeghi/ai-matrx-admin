import "./shell.css";
import { headers } from "next/headers";
import Sidebar from "./_components/Sidebar";
import Header from "./_components/Header";
import MobileDock from "./_components/MobileDock";
import MobileSideSheet from "./_components/MobileSideSheet";
import ThemeScript from "./_components/ThemeScript";
import SSRShellProviders from "./_components/SSRShellProviders";
import DeferredShellData from "./_components/DeferredShellData";
import DevPerfOverlayIsland from "./_components/DevPerfOverlayIsland";
import GlassPortal from "./_components/GlassPortal";
import NavActiveSync from "./_components/NavActiveSync";
import AdminIndicatorIsland from "./_components/AdminIndicatorIsland";

export const metadata = {
  title: "AI Matrx",
  description: "AI-powered admin dashboard",
};

export default async function SSRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only headers() — no auth, no DB, nothing async blocking paint
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/ssr";

  return (
    <>
      <ThemeScript />

      {/* Provider wraps entire shell so all client islands can access the store */}
      <SSRShellProviders>
        {/* Fires after first paint — fetches user + shell data, hydrates store */}
        <DeferredShellData />

        {/* data-pathname is the single source of truth for active nav state.
            NavActiveSync updates this after every client-side navigation.
            All nav components (sidebar, dock, mobile sheet) read from here via CSS. */}
        <div className="shell-root" data-pathname={pathname}>
          <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
          <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />
          <input type="checkbox" id="shell-user-menu" aria-hidden="true" />
          <input
            type="checkbox"
            id="shell-panel-toggle"
            defaultChecked
            aria-hidden="true"
          />
          <input type="checkbox" id="shell-panel-mobile" aria-hidden="true" />

          <Sidebar pathname={pathname} isAdmin={false} />
          <Header />

          <main className="shell-main">{children}</main>

          <MobileSideSheet isAdmin={false} />
        </div>

        {/* Glass chrome — portaled into #glass-layer (direct child of body)
            to guarantee backdrop-filter works in Chromium regardless of
            content stacking contexts created by shell-root/shell-main */}
        <GlassPortal>
          <MobileDock />
        </GlassPortal>

        <NavActiveSync />
        <DevPerfOverlayIsland />
        <AdminIndicatorIsland />
      </SSRShellProviders>
    </>
  );
}
