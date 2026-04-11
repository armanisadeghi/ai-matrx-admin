"use client";

import { AgentModelConfiguration } from "@/features/agents/components/builder/AgentModelConfiguration";
import { AgentSettingsCore } from "@/features/agents/components/settings-management/AgentSettingsCore";

export interface AgentModelPanelProps {
  agentId: string;
}

export function AgentModelPanel({ agentId }: AgentModelPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <AgentModelConfiguration agentId={agentId} />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <AgentSettingsCore agentId={agentId} />
      </div>
    </div>
  );
}
