"use client";

import { AgentGateBody } from "@/features/agents/components/agent-widgets/execution-gates/AgentGateInput";
import type { OverlayId } from "@/features/window-panels/registry/overlay-ids";

interface AgentGateWindowProps {
  instanceId: string;
  conversationId: string;
  downstreamOverlayId?: OverlayId;
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
