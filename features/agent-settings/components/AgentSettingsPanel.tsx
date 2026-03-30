"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentSettingsContent } from "./AgentSettingsContent";

interface AgentSettingsPanelProps {
  agentId: string;
  usedVariableNames?: Set<string>;
  showTools?: boolean;
  showVariables?: boolean;
  showParams?: boolean;
  /** CSS class to control the panel's height container */
  className?: string;
}

/**
 * Desktop inline panel — compact, VSCode-style.
 * Renders a scrollable column of settings sections.
 * Use alongside the main content area in a side-by-side layout.
 */
export function AgentSettingsPanel({
  agentId,
  usedVariableNames,
  showTools = true,
  showVariables = true,
  showParams = true,
  className,
}: AgentSettingsPanelProps) {
  return (
    <div
      className={
        className ??
        "h-full w-64 shrink-0 border-r border-border bg-card flex flex-col"
      }
    >
      <ScrollArea className="flex-1 overflow-auto">
        <AgentSettingsContent
          agentId={agentId}
          usedVariableNames={usedVariableNames}
          showTools={showTools}
          showVariables={showVariables}
          showParams={showParams}
        />
      </ScrollArea>
    </div>
  );
}
