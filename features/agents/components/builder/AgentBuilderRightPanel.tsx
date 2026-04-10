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
import { BuilderAutoClearButton } from "./BuilderAutoClearButton";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const { conversationId } = useAgentLauncher(agentId, {
    surfaceKey: "agent-builder",
    sourceFeature: "agent-builder",
    conversationMode: "chat",
  });

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
      surfaceKey="agent-builder"
      smartInputProps={{
        showSubmitOnEnterToggle: true,
        extraRightControls: (
          <BuilderAutoClearButton conversationId={conversationId} />
        ),
      }}
    />
  );
}
