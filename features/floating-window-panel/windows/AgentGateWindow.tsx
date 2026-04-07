"use client";

import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { AgentGateBody } from "@/features/agents/components/agent-widgets/parts/AgentGateInput";

interface AgentGateWindowProps {
  instanceId: string;
  agentInstanceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentGateWindow({
  instanceId,
  agentInstanceId,
  isOpen,
  onClose,
}: AgentGateWindowProps) {
  if (!isOpen) return null;
  return (
    <AgentGateBody
      instanceId={agentInstanceId}
      windowInstanceId={instanceId}
      onClose={onClose}
    />
  );
}
