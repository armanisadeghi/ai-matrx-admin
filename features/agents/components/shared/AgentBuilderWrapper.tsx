"use client";

import { AgentBuilder } from "@/features/agents/components/builder/AgentBuilder";
import { useAgentPageContext } from "./AgentPageContext";

export function AgentBuilderWrapper() {
  const { agentId } = useAgentPageContext();
  return <AgentBuilder agentId={agentId} />;
}
