"use client";

/**
 * AgentBuilderLeftPanel
 *
 * Renders all the left-column builder sections.
 * Each child is a smart component — reads/writes Redux directly.
 * This component only passes structural props (models, availableTools).
 */

import { AgentModelConfiguration } from "./AgentModelConfiguration";
import { AgentSystemMessage } from "./AgentSystemMessage";
import { AgentMessages } from "./AgentMessages";
import { AgentVariablesManager } from "./AgentVariablesManager";
import { AgentContextSlotsManager } from "./AgentContextSlotsManager";
import { AgentToolsManager } from "./AgentToolsManager";
import { Separator } from "@/components/ui/separator";

interface AgentBuilderLeftPanelProps {
  models: Array<{ id: string; name?: string; [key: string]: unknown }>;
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentBuilderLeftPanel({
  models,
  availableTools = [],
}: AgentBuilderLeftPanelProps) {
  return (
    <div className="flex flex-col gap-6 overflow-y-auto h-full pr-1">
      <AgentModelConfiguration
        models={models}
        availableTools={availableTools}
      />
      <Separator />
      <AgentSystemMessage />
      <Separator />
      <AgentMessages />
      <Separator />
      <AgentVariablesManager />
      <Separator />
      <AgentContextSlotsManager />
      <Separator />
      <AgentToolsManager availableTools={availableTools} />
      {/* Bottom padding so content doesn't hide behind save bar */}
      <div className="h-8 shrink-0" />
    </div>
  );
}
