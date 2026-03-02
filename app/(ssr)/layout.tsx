import "./shell.css";
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

        <div className="shell-root">
          <input type="checkbox" id="shell-sidebar-toggle" aria-hidden="true" />
          <input type="checkbox" id="shell-mobile-menu" aria-hidden="true" />

          <Sidebar pathname={pathname} isAdmin={false} />
          <Header />

          <main className="shell-main">
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
