"use client";

import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { AgentRunner } from "../smart/AgentRunner";
import { ExecutionManager } from "./execution-gates/ExecutionManager";
import { AgentChatHistorySidebar } from "./AgentChatHistorySidebar";

interface AgentFloatingChatProps {
  instanceId: string;
  onClose: () => void;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function AgentFloatingChat({
  instanceId,
  onClose,
}: AgentFloatingChatProps) {
  const displayTitle = useAppSelector(selectInstanceDisplayTitle(instanceId));

  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );

  // While waiting for pre-execution, don't render the chat window yet.
  if (needsPreExecution) return <ExecutionManager instanceId={instanceId} />;

  return (
    <WindowPanel
      title={displayTitle}
      onClose={onClose}
      width={420}
      height="60vh"
      minWidth={320}
      minHeight={280}
      bodyClassName="p-0"
      urlSyncKey="agent"
      urlSyncId={instanceId}
      urlSyncArgs={{ m: "fc" }}
      sidebar={<AgentChatHistorySidebar instanceId={instanceId} />}
      sidebarDefaultSize={250}
      sidebarMinSize={150}
      defaultSidebarOpen={false}
      sidebarExpandsWindow
      sidebarClassName="bg-muted/10"
      // footer={<AgentChatFooter instanceId={instanceId} />}
    >
      <AgentRunner instanceId={instanceId} compact className="h-full" />
    </WindowPanel>
  );
}
