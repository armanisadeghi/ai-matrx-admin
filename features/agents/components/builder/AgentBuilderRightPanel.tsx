"use client";

/**
 * AgentBuilderRightPanel — Test Run Panel
 *
 * Uses createManualInstance which reads from agentDefinition.agents[agentId] —
 * including dirty (unsaved) fields. So the test run always reflects the
 * current in-memory builder state, whether saved or not.
 */

import { Loader2 } from "lucide-react";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { AgentConversationColumn } from "../shared/AgentConversationColumn";
import type { ManagedAgentOptions } from "@/features/agents/types/instance.types";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const sourceFeature = "agent-builder";
  const surfaceKey = `${sourceFeature}:${agentId}`;

  const agentOptions: ManagedAgentOptions = {
    surfaceKey,
    sourceFeature,
    apiEndpointMode: "manual",
    showVariables: true,
    autoRun: false,
    allowChat: true,
    showVariablePanel: true,
    showAutoClearToggle: true,
    autoClearConversation: true,
  };

  const { conversationId, displayConversationId } = useAgentLauncher(
    agentId,
    agentOptions,
  );

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <AgentConversationColumn
      conversationId={conversationId}
      displayConversationId={displayConversationId ?? undefined}
      surfaceKey={surfaceKey}
      smartInputProps={{
        showSubmitOnEnterToggle: true,
      }}
    />
  );
}
