"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectNeedsPreExecutionInput,
  selectInstanceDisplayTitle,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { openAgentGateWindow } from "@/lib/redux/slices/overlaySlice";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { AgentRunner } from "../smart/AgentRunner";
import { AgentChatHistorySidebar, AgentChatFooter } from "./parts/SharedParts";

interface AgentFloatingChatProps {
  instanceId: string;
  onClose: () => void;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function AgentFloatingChat({
  instanceId,
  onClose,
}: AgentFloatingChatProps) {
  const dispatch = useAppDispatch();
  const displayTitle = useAppSelector(selectInstanceDisplayTitle(instanceId));
  const needsPreExecution = useAppSelector(
    selectNeedsPreExecutionInput(instanceId),
  );

  // Stable window instanceId — one gate window per agent instance.
  // Using a ref so it never changes across re-renders.
  const gateWindowId = useRef(`gate-${instanceId}`).current;

  // When pre-execution input is needed, open the gate window via Redux.
  // When it's no longer needed (user continued or cancelled), nothing to clean up
  // since the gate window closes itself on continue/cancel.
  useEffect(() => {
    if (!needsPreExecution) return;
    dispatch(
      openAgentGateWindow({
        instanceId: gateWindowId,
        agentInstanceId: instanceId,
      }),
    );
  }, [needsPreExecution, gateWindowId, instanceId, dispatch]);

  // While waiting for pre-execution, don't render the chat window yet.
  if (needsPreExecution) return null;

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
