// /layout.tsx
"use  client";

import { StructuredEditorProvider } from "@/app/contexts/StructuredEditorContext";

import { ModuleHeader } from "@/components/matrx/navigation";
import { filteredPages, MODULE_HOME, MODULE_NAME } from "./config";

export default function Layout({ children }: { children: React.ReactNode }) {
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="flex flex-col h-full">
      <ModuleHeader
        pages={filteredPages}
        currentPath={currentPath}
        moduleHome={MODULE_HOME}
        moduleName={MODULE_NAME}
      />
      <main className="flex-1">
        <StructuredEditorProvider>{children}</StructuredEditorProvider>
      </main>
    </div>
  );
}
