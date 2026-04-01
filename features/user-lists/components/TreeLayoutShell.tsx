"use client";

import React, { useState } from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface TreeLayoutShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function TreeLayoutShell({ sidebar, children }: TreeLayoutShellProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="relative flex flex-col h-[calc(100dvh-var(--header-height))]">
        <div className="flex-1 overflow-hidden">{children}</div>

        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 left-4 z-40 h-9 gap-1.5 shadow-md"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          onClick={() => setDrawerOpen(true)}
        >
          <PanelLeft className="h-4 w-4" />
          Browse
        </Button>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[75dvh]">
            <DrawerTitle className="sr-only">Lists browser</DrawerTitle>
            <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
              {sidebar}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-var(--header-height))]">
      {/* Fixed-width tree sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-border/60 flex flex-col overflow-hidden">
        {sidebar}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden min-w-0">{children}</div>
    </div>
  );
}
