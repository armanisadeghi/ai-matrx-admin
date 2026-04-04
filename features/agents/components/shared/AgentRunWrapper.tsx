"use client";

import { AgentRunPage } from "@/features/agents/components/run/AgentRunPage";
import { useAgentPageContext } from "./AgentPageContext";

export function AgentRunWrapper() {
  const { agentId, agentName } = useAgentPageContext();
  return <AgentRunPage agentId={agentId} agentName={agentName} />;
}
