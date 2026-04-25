"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectLiveAgents } from "@/features/agents/redux/agent-definition/selectors";
import { selectMcpCatalog } from "@/features/agents/redux/mcp/mcp.slice";
import {
  selectSkillDefinitionsCount,
  selectRenderDefinitionsCount,
  selectResourcesCount,
} from "../redux/skl/selectors";
import { SIDEBAR_SECTIONS } from "../constants";
import type { AgentConnectionsSection } from "../types";

interface AgentConnectionsSidebarProps {
  activeSection: AgentConnectionsSection;
  onSelect: (section: AgentConnectionsSection) => void;
}

export function AgentConnectionsSidebar({
  activeSection,
  onSelect,
}: AgentConnectionsSidebarProps) {
  const agentsCount = useAppSelector(selectLiveAgents).length;
  const mcpCount = useAppSelector(selectMcpCatalog).length;
  const skillsCount = useAppSelector(selectSkillDefinitionsCount);
  const renderBlocksCount = useAppSelector(selectRenderDefinitionsCount);
  const resourcesCount = useAppSelector(selectResourcesCount);

  const countFor = (value: AgentConnectionsSection): number | null => {
    switch (value) {
      case "agents":
        return agentsCount;
      case "skills":
        return skillsCount;
      case "renderBlocks":
        return renderBlocksCount;
      case "resources":
        return resourcesCount;
      case "mcpServers":
        return mcpCount;
      // subagents/commands/registries: counts come online with their data
      // sources (kind column, schema, registry sync respectively).
      default:
        return null;
    }
  };

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="flex flex-col gap-0.5 p-2">
        {SIDEBAR_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = section.value === activeSection;
          const count = countFor(section.value);
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
