"use client";

import { useAgentLauncher } from "../../hooks/useAgentLauncher";
import type { SourceFeature } from "@/features/agents/types/instance.types";
import { AgentRunner } from "./AgentRunner";

interface AgentRunWrapperProps {
  agentId: string;
  sourceFeature: SourceFeature;
}

export function AgentRunWrapper({
  agentId,
  sourceFeature,
}: AgentRunWrapperProps) {
  const surfaceKey = `${sourceFeature}:${agentId}`;

  const { conversationId } = useAgentLauncher(agentId, {
    surfaceKey,
    sourceFeature,
    apiEndpointMode: "agent",
    showVariables: true,
    autoRun: false,
    allowChat: true,
    showVariablePanel: true,
    showDefinitionMessages: true,
    showDefinitionMessageContent: true,
    showPreExecutionGate: false,
    autoClearConversation: false,
  });

  return (
    <AgentRunner conversationId={conversationId} surfaceKey={surfaceKey} />
  );
}
