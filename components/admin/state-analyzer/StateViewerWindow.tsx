"use client";

import React, { useState } from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import type { RootState } from "@/lib/redux/store";
import { useAppStore } from "@/lib/redux/hooks";
import {
  getStateViewerTabs,
  STATE_VIEWER_DEFAULT_TAB_ID,
} from "./stateViewerTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Menu, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
interface StateViewerWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const useCompleteState = (): RootState => {
  const store = useAppStore();
  return store.getState();
};

export default function StateViewerWindow({
  isOpen,
  onClose,
}: StateViewerWindowProps) {
  const completeState = useCompleteState();
  const [activeTabId, setActiveTabId] = useState<string>(
    STATE_VIEWER_DEFAULT_TAB_ID,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const tabs = getStateViewerTabs(completeState);

  const sortedTabs = [...tabs].sort((a, b) => a.label.localeCompare(b.label));
  const filteredTabs = sortedTabs.filter((t) =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeTabContent = tabs.find((t) => t.id === activeTabId)?.content;

  return (
    <WindowPanel
      title="State Analyzer"
      minWidth={800}
      minHeight={600}
      initialRect={{
        x: window.innerWidth / 2 - 400,
        y: window.innerHeight / 2 - 300,
      }}
      urlSyncKey="state_analyzer"
      onClose={onClose}
    >
      <div className="flex w-full h-full bg-background overflow-hidden flex-row">
        {/* Collapsible Sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out border-r border-border bg-muted/10 flex flex-col ${
            sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
          }`}
        >
          {sidebarOpen && (
            <>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search slices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 w-full">
                <div className="p-2 space-y-0.5">
                  {filteredTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors truncate",
                        activeTabId === tab.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center p-2 border-b border-border bg-muted/40 z-10 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 mr-2 shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm truncate">
              {tabs.find((t) => t.id === activeTabId)?.label || "Slice Viewer"}
            </span>
          </div>
          <div className="flex-1 p-4 overflow-hidden relative">
            {activeTabContent}
          </div>
        </div>
      </div>
    </WindowPanel>
  );
}
