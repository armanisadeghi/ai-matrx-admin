"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import FloatingSheet from "@/components/official/FloatingSheet";
import { AgentRunner } from "../smart/AgentRunner";
import { ExecutionManager } from "./execution-gates/ExecutionManager";

interface AgentSidebarOverlayProps {
  conversationId: string;
  onClose: () => void;
}

export function AgentSidebarOverlay({
  conversationId,
  onClose,
}: AgentSidebarOverlayProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(conversationId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(conversationId),
  );

  if (needsPreExecution) return <ExecutionManager conversationId={conversationId} />;

  return (
    <FloatingSheet
      isOpen={true}
      onClose={onClose}
      title={title}
      position="right"
      width="2xl"
      height="full"
      closeOnBackdropClick={true}
      closeOnEsc={true}
      showCloseButton={true}
      contentClassName="p-0"
      lockScroll={false}
    >
      <AgentRunner conversationId={conversationId} className="h-full bg-background" />
    </FloatingSheet>
  );
}
