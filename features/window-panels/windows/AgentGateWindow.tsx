"use client";

import { AgentGateBody } from "@/features/agents/components/agent-widgets/execution-gates/AgentGateInput";

interface AgentGateWindowProps {
  instanceId: string;
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentGateWindow({
  instanceId,
  conversationId,
  isOpen,
  onClose,
}: AgentGateWindowProps) {
  if (!isOpen) return null;
  return (
    <AgentGateBody
      conversationId={conversationId}
      windowInstanceId={instanceId}
      onClose={onClose}
    />
  );
}
