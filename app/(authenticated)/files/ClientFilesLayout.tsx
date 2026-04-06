"use client";

import React from "react";
import { FileManagerSidebar } from "./components/FileManagerSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function ClientFilesLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  // On mobile, skip the sidebar layout entirely and let the page handle its own layout
  if (isMobile) {
    return <>{children}</>;
  }

  // Desktop view with sidebar
  return (
    <div className="flex h-page overflow-hidden">
      <FileManagerSidebar />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
