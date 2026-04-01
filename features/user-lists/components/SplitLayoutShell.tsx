"use client";

import React, { useState } from "react";
import { PanelLeft } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface SplitLayoutShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/*
 * The app's <main> element has no explicit height — it's content-sized.
 * Per the react-resizable-panels docs, Group's default height:100% collapses
 * when the containing block height is not explicitly set (CSS spec).
 *
 * Fix: give Group an explicit height via inline style.
 * --header-height = 2.5rem (h-10). Header is fixed, sidebar is fixed.
 * Content area starts at top:40px so available height = 100dvh - 40px.
 */
const CONTENT_HEIGHT = "calc(100dvh - 2.5rem)";

export function SplitLayoutShell({ sidebar, children }: SplitLayoutShellProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isMobile) {
    return (
      <div
        style={{
          height: CONTENT_HEIGHT,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>

        <Button
          variant="secondary"
          size="sm"
          className="fixed left-4 z-40 h-9 gap-1.5 shadow-md"
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
    <Group orientation="horizontal" style={{ height: CONTENT_HEIGHT }}>
      <Panel defaultSize={22} minSize={14} maxSize={40}>
        <div className="h-full flex flex-col overflow-hidden border-r border-border/60">
          {sidebar}
        </div>
      </Panel>

      <Separator
        className={cn(
          "relative flex w-px items-center justify-center bg-border",
          "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
        style={{ cursor: "col-resize" }}
      >
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
          <DragHandleDots2Icon className="h-2.5 w-2.5" />
        </div>
      </Separator>

      <Panel defaultSize={78} minSize={40}>
        <div className="h-full flex flex-col overflow-hidden">{children}</div>
      </Panel>
    </Group>
  );
}
