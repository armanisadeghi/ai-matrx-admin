"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectInstanceDisplayTitle } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import FloatingSheet from "@/components/official/FloatingSheet";
import { AgentRunner } from "../smart/AgentRunner";

interface AgentPanelOverlayProps {
  conversationId: string;
  onClose: () => void;
}

export function AgentPanelOverlay({
  conversationId,
  onClose,
}: AgentPanelOverlayProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));

  return (
    <FloatingSheet
      isOpen={true}
      onClose={onClose}
      title={title}
      position="right"
      width="lg"
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
      lockScroll={false}
    >
      <AgentRunner
        conversationId={conversationId}
        className="h-full bg-background"
      />
    </FloatingSheet>
  );
}
