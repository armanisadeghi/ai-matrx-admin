"use client";

import { AgentGateBody } from "@/features/agents/components/agent-widgets/execution-gates/AgentGateInput";

interface AgentGateWindowProps {
  instanceId: string;
  conversationId: string;
  downstreamOverlayId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentGateWindow({
  instanceId,
  conversationId,
  downstreamOverlayId,
  isOpen,
  onClose,
}: AgentGateWindowProps) {
  if (!isOpen) return null;
  return (
    <AgentGateBody
      conversationId={conversationId}
      windowInstanceId={instanceId}
      downstreamOverlayId={downstreamOverlayId}
      onClose={onClose}
    />
  );
}
