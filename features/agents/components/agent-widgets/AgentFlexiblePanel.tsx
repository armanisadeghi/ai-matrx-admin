"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { AgentRunner } from "../smart/AgentRunner";
import { ExecutionManager } from "./execution-gates/ExecutionManager";

interface AgentFlexiblePanelProps {
  instanceId: string;
  onClose: () => void;
}

export function AgentFlexiblePanel({
  instanceId,
  onClose,
}: AgentFlexiblePanelProps) {
  const title = useAppSelector(selectInstanceDisplayTitle(instanceId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );

  if (needsPreExecution) return <ExecutionManager instanceId={instanceId} />;

  return (
    <WindowPanel
      id={`agent-${instanceId}`}
      title={title}
      onClose={onClose}
      width={680}
      height={500}
      minWidth={300}
      minHeight={250}
      bodyClassName="p-0"
      urlSyncKey="agent"
      urlSyncId={instanceId}
      urlSyncArgs={{ m: "flexible-panel" }}
    >
      <AgentRunner instanceId={instanceId} className="h-full bg-background" />
    </WindowPanel>
  );
}
