"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { AgentRunner } from "../smart/AgentRunner";
import {
  PreExecutionCard,
  AgentChatHistorySidebar,
  AgentChatFooter,
} from "./SharedParts";

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

  if (needsPreExecution) {
    return <PreExecutionCard instanceId={instanceId} onClose={onClose} />;
  }

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
      sidebarDefaultSize={30}
      sidebarMinSize={15}
      defaultSidebarOpen={false}
      sidebarClassName="bg-muted/10"
      footer={<AgentChatFooter instanceId={instanceId} />}
    >
      <AgentRunner instanceId={instanceId} compact className="h-full" />
    </WindowPanel>
  );
}
