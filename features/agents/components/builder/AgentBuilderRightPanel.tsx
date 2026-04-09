"use client";

/**
 * AgentBuilderRightPanel — Test Run Panel
 *
 * Uses createManualInstance which reads from agentDefinition.agents[agentId] —
 * including dirty (unsaved) fields. So the test run always reflects the
 * current in-memory builder state, whether saved or not.
 */

import { Loader2 } from "lucide-react";
import { useAgentInstance } from "@/features/agents/hooks/useAgentInstance";
import { AgentConversationColumn } from "../shared/AgentConversationColumn";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const { instanceId, setInstanceId } = useAgentInstance(agentId, {
    sourceFeature: "agent-builder",
    useChat: true,
    autoClearConversation: true,
    conversationMode: "chat",
  });

  if (!instanceId) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm">Initializing...</span>
      </div>
    );
  }

  return (
    <AgentConversationColumn
      instanceId={instanceId}
      onNewInstance={setInstanceId}
      smartInputProps={{
        showAutoClearToggle: true,
        showSubmitOnEnterToggle: true,
      }}
    />
  );
}
