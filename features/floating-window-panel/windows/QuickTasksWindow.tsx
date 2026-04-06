"use client";

import React, { useState } from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { QuickTasksSheet } from "@/features/tasks/components/QuickTasksSheet";
import { Button } from "@/components/ui/button";
import { Menu, Star, CheckSquare, Clock } from "lucide-react";

interface QuickTasksWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function QuickTasksWindow({
  isOpen,
  onClose,
}: QuickTasksWindowProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Quick Tasks"
      initialRect={{ width: 800, height: 600, x: 200, y: 150 }}
      urlSyncKey="quick_tasks"
      onClose={onClose}
    >
      <div className="flex h-full bg-background overflow-hidden">


        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">

          <div className="flex-1 relative">
            <QuickTasksSheet className="absolute inset-0" />
          </div>
        </div>
      </div>
    </WindowPanel>
  );
}
