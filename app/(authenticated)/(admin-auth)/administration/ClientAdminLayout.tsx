"use client";

import { usePathname } from "next/navigation";
import { ModuleHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { filteredPages, MODULE_HOME, MODULE_NAME } from "./config";

/**
 * "Fullscreen" admin routes — pages that render their own in-page chrome
 * (e.g. the system-agent builder/runner) and look wrong with the global
 * ModuleHeader bar stacked above them. For these paths we hide the
 * ModuleHeader and let the page own the top strip.
 *
 * Add new patterns here as more fullscreen detail routes are introduced.
 */
function isFullscreenRoute(pathname: string): boolean {
  // System agent detail routes: /administration/system-agents/agents/<id>[/...]
  if (/^\/administration\/system-agents\/agents\/[^/]+(?:\/.*)?$/.test(pathname)) {
    // The list page lives at /administration/system-agents/agents — keep the
    // header there. Everything deeper is fullscreen.
    return pathname !== "/administration/system-agents/agents";
  }
  return false;
}

export function ClientAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const fullscreen = isFullscreenRoute(pathname);

  return (
    <div className="flex flex-col h-page">
      {!fullscreen && (
        <ModuleHeader
          pages={filteredPages}
          currentPath={pathname}
          moduleHome={MODULE_HOME}
          moduleName={MODULE_NAME}
        />
      )}
      <main className="w-full flex-1 min-h-0 bg-textured overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
