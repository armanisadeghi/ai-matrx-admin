"use client";

import React, { useState } from "react";
import { WindowPanel } from "@/components/official-candidate/floating-window-panel/WindowPanel";
import { QuickTasksSheet } from "@/features/tasks/components/QuickTasksSheet";
import { Button } from "@/components/ui/button";
import { Menu, Star, CheckSquare, Clock } from "lucide-react";

interface QuickTasksWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function QuickTasksWindow({ isOpen, onClose }: QuickTasksWindowProps) {
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
        {/* Collapsible Sidebar */}
        <div 
          className={`flex-shrink-0 transition-all duration-300 ease-in-out border-r border-border bg-muted/20 ${
            sidebarOpen ? "w-64" : "w-0 overflow-hidden"
          }`}
        >
          {sidebarOpen && (
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-sm mb-4">Task Filters</h3>
              <div className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  <Star className="mr-2 h-4 w-4" /> Important
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  <Clock className="mr-2 h-4 w-4" /> Recent
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  <CheckSquare className="mr-2 h-4 w-4" /> Completed
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center p-2 border-b border-border bg-muted/40">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8"
              title="Toggle Sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <span className="ml-2 font-medium text-sm">Tasks</span>
          </div>
          <div className="flex-1 relative">
            <QuickTasksSheet className="absolute inset-0" />
          </div>
        </div>
      </div>
    </WindowPanel>
  );
}
