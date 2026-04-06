"use client";

import React from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { QuickTasksSheet } from "@/features/tasks/components/QuickTasksSheet";

interface QuickTasksWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function QuickTasksWindow({
  isOpen,
  onClose,
}: QuickTasksWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Quick Tasks"
      initialRect={{ width: 800, height: 600, x: 200, y: 150 }}
      urlSyncKey="quick_tasks"
      onClose={onClose}
    >
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <QuickTasksSheet className="flex-1" />
      </div>
    </WindowPanel>
  );
}
