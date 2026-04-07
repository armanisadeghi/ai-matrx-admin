"use client";

/**
 * AgentBuilderRightPanel — Test Run Panel
 *
 * Uses createManualInstance which reads from agentDefinition.agents[agentId] —
 * including dirty (unsaved) fields. So the test run always reflects the
 * current in-memory builder state, whether saved or not.
 *
 * Headerless, full-height, no max-width constraints. The reset action lives
 * inside AgentRequestStats (appears only after a response).
 */

import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { useAgentLauncher } from "@/features/agents/hooks/useAgentLauncher";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { CreatorRunPanel } from "../run-controls/CreatorRunPanel";
import { SmartAgentInput } from "../inputs/SmartAgentInput";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const dispatch = useAppDispatch();
  const { launchAgent } = useAgentLauncher();
  const [instanceId, setInstanceId] = useState<string | null>(null);

  useEffect(() => {
    let createdId: string | null = null;

    launchAgent(agentId, {
      sourceFeature: "agent-builder",
      autoRun: false,
      displayMode: "direct",
      useChat: true,
      autoClearConversation: true,
      conversationMode: "chat",
    })
      .then((result) => {
        createdId = result.instanceId;
        setInstanceId(result.instanceId);
      })
      .catch((err) => console.error("Failed to create test instance:", err));

    return () => {
      if (createdId) {
        dispatch(destroyInstance(createdId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {instanceId ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 bg-background">
            <AgentConversationDisplay instanceId={instanceId} />
          </div>

          <CreatorRunPanel
            instanceId={instanceId}
            onNewInstance={setInstanceId}
          />

          <SmartAgentInput
            instanceId={instanceId}
            showAutoClearToggle
            showSubmitOnEnterToggle
            onNewInstance={setInstanceId}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Initializing...
        </div>
      )}
    </div>
  );
}
