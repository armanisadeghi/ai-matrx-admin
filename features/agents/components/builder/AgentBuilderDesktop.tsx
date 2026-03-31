"use client";

import { AgentBuilderLeftPanel } from "./AgentBuilderLeftPanel";
import { AgentBuilderRightPanel } from "./AgentBuilderRightPanel";

interface AgentBuilderDesktopProps {
  models: Array<{ id: string; name?: string; [key: string]: unknown }>;
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentBuilderDesktop({
  models,
  availableTools = [],
}: AgentBuilderDesktopProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Edit panel */}
      <div className="h-full overflow-hidden">
        <AgentBuilderLeftPanel
          models={models}
          availableTools={availableTools}
        />
      </div>
      {/* Right: Test panel */}
      <div className="h-full overflow-hidden">
        <AgentBuilderRightPanel />
      </div>
    </div>
  );
}
