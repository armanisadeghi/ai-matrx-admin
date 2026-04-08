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
  instanceId: string;
  onClose: () => void;
}

export function AgentSidebarOverlay({
  instanceId,
  onClose,
}: AgentSidebarOverlayProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );

  if (needsPreExecution) return <ExecutionManager instanceId={instanceId} />;

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
      <AgentRunner instanceId={instanceId} className="h-full bg-background" />
    </FloatingSheet>
  );
}
