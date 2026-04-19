// components/official/content-editor/ContentEditorTabs.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentEditor } from "./ContentEditor";
import type { EditorMode, HeaderAction, ContentEditorProps } from "./types";

export interface ContentEditorTab {
  id: string;
  title: string;
  value: string;
}

type SharedEditorProps = Omit<
  ContentEditorProps,
  | "value"
  | "onChange"
  | "title"
  | "collapsible"
  | "defaultCollapsed"
  | "mode"
  | "onModeChange"
  | "className"
>;

export interface ContentEditorTabsProps extends SharedEditorProps {
  tabs: ContentEditorTab[];
  onTabsChange: (tabs: ContentEditorTab[]) => void;

  // Active tab (controlled or uncontrolled)
  activeTabId?: string;
  defaultActiveTabId?: string;
  onActiveTabChange?: (id: string) => void;

  // Collapse applies to the whole group (not per tab)
  collapsible?: boolean;
  defaultCollapsed?: boolean;

  // Tab management
  allowAddTab?: boolean;
  allowCloseTab?: boolean;
  onAddTab?: () => ContentEditorTab; // factory for new tab
  maxTabTitleLength?: number;

  className?: string;
}

export function ContentEditorTabs({
  tabs,
  onTabsChange,
  activeTabId: controlledActiveId,
  defaultActiveTabId,
  onActiveTabChange,
  collapsible = false,
  defaultCollapsed = false,
  allowAddTab = false,
  allowCloseTab = false,
  onAddTab,
  maxTabTitleLength = 24,
  className,
  ...sharedEditorProps
}: ContentEditorTabsProps) {
  const [internalActiveId, setInternalActiveId] = useState<string>(
    defaultActiveTabId ?? tabs[0]?.id ?? "",
  );
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const activeTabId = controlledActiveId ?? internalActiveId;

  // If the active tab gets removed externally, fall back to the first tab.
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && tabs[0]) {
      const nextId = tabs[0].id;
      if (controlledActiveId === undefined) setInternalActiveId(nextId);
      onActiveTabChange?.(nextId);
    }
  }, [tabs, activeTabId, controlledActiveId, onActiveTabChange]);

  const setActiveTab = useCallback(
    (id: string) => {
      if (controlledActiveId === undefined) setInternalActiveId(id);
      onActiveTabChange?.(id);
    },
    [controlledActiveId, onActiveTabChange],
  );

  const handleContentChange = useCallback(
    (id: string) => (newValue: string) => {
      onTabsChange(
        tabs.map((t) => (t.id === id ? { ...t, value: newValue } : t)),
      );
    },
    [tabs, onTabsChange],
  );

  const handleCloseTab = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = tabs.filter((t) => t.id !== id);
      onTabsChange(next);
      if (id === activeTabId && next[0]) {
        setActiveTab(next[0].id);
      }
    },
    [tabs, onTabsChange, activeTabId, setActiveTab],
  );

  const handleAddTab = useCallback(() => {
    if (!onAddTab) return;
    const tab = onAddTab();
    onTabsChange([...tabs, tab]);
    setActiveTab(tab.id);
  }, [onAddTab, tabs, onTabsChange, setActiveTab]);

  const truncate = (s: string) =>
    s.length > maxTabTitleLength ? s.slice(0, maxTabTitleLength - 1) + "…" : s;

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div
      className={cn(
        "flex flex-col bg-textured border border-border rounded-lg overflow-hidden",
        className,
      )}
    >
      {/* Tab bar */}
      <div className="flex-none flex items-stretch bg-zinc-100 dark:bg-zinc-900 border-b border-border">
        {collapsible && (
          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            className="flex items-center justify-center px-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </button>
        )}

        <div className="flex-1 flex items-stretch overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border select-none transition-colors max-w-[200px]",
                  isActive
                    ? "bg-white dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60",
                )}
                title={tab.title}
              >
                <span className="truncate">{truncate(tab.title)}</span>
                {allowCloseTab && tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className={cn(
                      "flex-none flex items-center justify-center h-4 w-4 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-opacity",
                      isActive
                        ? "opacity-70"
                        : "opacity-0 group-hover:opacity-70",
                    )}
                    title="Close tab"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {allowAddTab && onAddTab && (
            <button
              type="button"
              onClick={handleAddTab}
              className="flex-none flex items-center justify-center px-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
              title="New tab"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active tab content */}
      {!isCollapsed && activeTab && (
        <ContentEditor
          // Remount when switching tabs so internal state (mode, etc.) stays tab-local.
          key={activeTab.id}
          value={activeTab.value}
          onChange={handleContentChange(activeTab.id)}
          title={undefined}
          collapsible={false}
          {...sharedEditorProps}
          className="border-0 rounded-none"
        />
      )}
    </div>
  );
}
