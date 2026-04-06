"use client";

import React, { useState } from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { QuickFilesSheet } from "@/features/quick-actions/components/QuickFilesSheet";
import { FileManagerSidebar } from "@/app/(authenticated)/files/components/FileManagerSidebar";
import { Button } from "@/components/ui/button";
import { Menu, LayoutPanelLeft, LayoutPanelTop } from "lucide-react";

interface QuickFilesWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function QuickFilesWindow({
  isOpen,
  onClose,
}: QuickFilesWindowProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"side" | "below">("side");

  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Quick Files"
      initialRect={{ width: 900, height: 600, x: 250, y: 150 }}
      urlSyncKey="quick_files"
      onClose={onClose}
    >
      <div
        className={`flex w-full h-full bg-background overflow-hidden ${layoutMode === "below" ? "flex-col" : "flex-row"}`}
      >
        {/* Collapsible Sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out border-border bg-muted/10 ${
            layoutMode === "below" ? "border-b" : "border-r"
          } ${
            sidebarOpen
              ? layoutMode === "side"
                ? "w-64"
                : "h-64"
              : layoutMode === "side"
                ? "w-0 overflow-hidden border-r-0"
                : "h-0 overflow-hidden border-b-0"
          }`}
        >
          {sidebarOpen && (
            <div className="h-full w-full overflow-hidden flex flex-col">
              <FileManagerSidebar />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="flex items-center p-2 border-b border-border bg-muted/40 z-10 shrink-0 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 mr-2"
              title="Toggle Sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm flex-1">Files</span>

            <div className="flex items-center space-x-1">
              <Button
                variant={layoutMode === "side" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setLayoutMode("side")}
                className="h-8 w-8"
                title="Sidebar Layout"
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={layoutMode === "below" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setLayoutMode("below")}
                className="h-8 w-8"
                title="Top-Bottom Layout"
              >
                <LayoutPanelTop className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <QuickFilesSheet className="absolute inset-0" />
          </div>
        </div>
      </div>
    </WindowPanel>
  );
}
