"use client";

import { ModuleHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { filteredPages, MODULE_HOME, MODULE_NAME } from "./config";
import { EntityPack } from "@/providers/packs/EntityPack";

export function AdminDashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <EntityPack>
      <div className="flex flex-col h-full">
        <ModuleHeader
          pages={filteredPages}
          currentPath={currentPath}
          moduleHome={MODULE_HOME}
          moduleName={MODULE_NAME}
        />
        <main className="w-full h-full bg-textured">{children}</main>
      </div>
    </EntityPack>
  );
}
