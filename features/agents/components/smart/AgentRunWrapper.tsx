"use client";

import { useAgentLauncher } from "../../hooks/useAgentLauncher";
import { SourceFeature } from "../../types";
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
    conversationMode: "agent",
    showVariables: true,
    autoRun: false,
    allowChat: true,
    showVariablePanel: true,
    showDefinitionMessages: true,
    showDefinitionMessageContent: true,
    usePreExecutionInput: false,
    autoClearConversation: false,
  });

  return <AgentRunner conversationId={conversationId} />;
}
