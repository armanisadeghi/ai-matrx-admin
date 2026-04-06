"use client";

import React from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { QuickFilesSheet } from "@/features/quick-actions/components/QuickFilesSheet";
import { FileManagerSidebar } from "@/app/(authenticated)/files/components/FileManagerSidebar";

interface QuickFilesWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function QuickFilesWindow({
  isOpen,
  onClose,
}: QuickFilesWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Quick Files"
      width={900}
      height={600}
      urlSyncKey="quick_files"
      onClose={onClose}
      sidebar={<FileManagerSidebar />}
      sidebarDefaultSize={30}
      sidebarMinSize={15}
      sidebarClassName="bg-muted/10"
    >
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <QuickFilesSheet className="flex-1" />
      </div>
    </WindowPanel>
  );
}
