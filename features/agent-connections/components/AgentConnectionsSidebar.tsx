"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SIDEBAR_SECTIONS } from "../constants";
import type { AgentConnectionsSection } from "../types";

export type SectionCounts = Partial<Record<AgentConnectionsSection, number>>;

interface AgentConnectionsSidebarProps {
  activeSection: AgentConnectionsSection;
  onSelect: (section: AgentConnectionsSection) => void;
  counts?: SectionCounts;
}

export function AgentConnectionsSidebar({
  activeSection,
  onSelect,
  counts,
}: AgentConnectionsSidebarProps) {
  return (
    <ScrollArea className="flex-1 w-full">
      <div className="flex flex-col gap-0.5 p-2">
        {SIDEBAR_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = section.value === activeSection;
          const count = counts?.[section.value];
          return (
            <button
              key={section.value}
              type="button"
              onClick={() => onSelect(section.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{section.label}</span>
              {typeof count === "number" && count > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default AgentConnectionsSidebar;
