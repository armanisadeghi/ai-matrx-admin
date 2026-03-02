import "./shell.css";
import { Suspense } from "react";
import { headers } from "next/headers";
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
  // Only headers() — no auth, no DB, no async blocking
  const headersList = await headers();
  const fullUrl = headersList.get("x-url") || headersList.get("x-invoke-path") || "";
  const pathname = headersList.get("x-pathname") || new URL(fullUrl || "http://localhost/ssr/dashboard").pathname;

  return (
    <>
      <ThemeScript />

      {/* Provider wraps entire shell so all client islands (Header, Sidebar, etc.) can access the store */}
      <SSRShellProviders>
        <div className="shell-root">
          <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
          <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />

          <Sidebar pathname={pathname} isAdmin={false} />
          <Header />

          <main className="shell-main">
            {/* Auth + RPC happens here, inside Suspense — never blocks paint */}
            <Suspense fallback={null}>
              <DeferredShellData />
            </Suspense>
            {children}
          </main>

          <MobileDock />
          <MobileSideSheet pathname={pathname} isAdmin={false} />
        </div>

        <DevPerfOverlay />
      </SSRShellProviders>
    </>
  );
}
