"use client";

import React, { useState } from "react";
import { PanelLeft } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface SplitLayoutShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function SplitLayoutShell({ sidebar, children }: SplitLayoutShellProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="relative flex flex-col h-[calc(100dvh-var(--header-height))]">
        {/* Main content fills the screen */}
        <div className="flex-1 overflow-hidden">{children}</div>

        {/* Floating button to open the lists drawer */}
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 left-4 z-40 h-9 gap-1.5 shadow-md pb-safe"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          onClick={() => setDrawerOpen(true)}
        >
          <PanelLeft className="h-4 w-4" />
          Lists
        </Button>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[70dvh]">
            <DrawerTitle className="sr-only">Lists</DrawerTitle>
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
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel
          defaultSize={22}
          minSize={14}
          maxSize={40}
          className="flex flex-col min-h-0 border-r border-border/60"
        >
          <div className="flex-1 overflow-hidden h-full">{sidebar}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={78}
          minSize={40}
          className="flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-hidden h-full">{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
