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
import AdminNavInjector from "./_components/AdminNavInjector";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AppleKeyExpiryBanner from "@/components/admin/AppleKeyExpiryBanner";
import { PreferenceSyncProvider } from "@/providers/usePreferenceSync";
import { DebugIndicatorManager } from "@/components/debug/DebugIndicatorManager";
import { CanvasSideSheet } from "@/features/canvas/core/CanvasSideSheet";
import LazySocketInitializer from "@/lib/redux/socket-io/connection/LazySocketInitializer";
import LazyMessagingIsland from "./_components/LazyMessagingIsland";

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
        {/* Injects admin nav items into sidebar/mobile sheet after Redux hydration */}
        <AdminNavInjector />
        {/* Show announcements for users with unviewed system announcements */}
        <AnnouncementProvider />
        {/* Show Apple key expiry warning for admin users */}
        <AppleKeyExpiryBanner />
        {/* Socket.IO — connects on-demand when a component calls useEnsureSocket() */}
        <LazySocketInitializer />

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

          <Sidebar pathname={pathname} />
          <Header />

          <main className="shell-main">
            <PreferenceSyncProvider>{children}</PreferenceSyncProvider>
          </main>

          <MobileSideSheet />
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
        <DebugIndicatorManager />
        {/* Global Canvas Side Sheet — Available everywhere (routes, modals, sheets) */}
        <CanvasSideSheet />
        {/* Global Messaging System — lazy-loaded on first panel open */}
        <LazyMessagingIsland />
      </SSRShellProviders>
    </>
  );
}
