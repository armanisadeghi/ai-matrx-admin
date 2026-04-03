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

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { AgentRequestStats } from "../run/AgentRequestStats";
import { SmartAgentInput } from "../smart";
import { BuilderAdvancedSettingsPopover } from "./BuilderAdvancedSettingsPopover";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const dispatch = useAppDispatch();
  const [instanceId, setInstanceId] = useState<string | null>(null);

  useEffect(() => {
    let createdId: string | null = null;

    dispatch(
      createManualInstance({
        agentId,
        autoClearConversation: true,
        mode: "chat",
      }),
    )
      .unwrap()
      .then((id) => {
        createdId = id;
        setInstanceId(id);
      })
      .catch((err) => console.error("Failed to create test instance:", err));

    return () => {
      if (createdId) {
        dispatch(destroyInstance(createdId));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleNewInstance = useCallback((newId: string) => {
    setInstanceId(newId);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {instanceId ? (
        <>
          <div className="flex items-center justify-end px-2 py-1 shrink-0">
            <BuilderAdvancedSettingsPopover instanceId={instanceId} />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <AgentConversationDisplay instanceId={instanceId} />
          </div>

          <AgentRequestStats
            instanceId={instanceId}
            agentId={agentId}
            onNewInstance={setInstanceId}
          />

          <SmartAgentInput
            instanceId={instanceId}
            showAutoClearToggle
            showSubmitOnEnterToggle
            onNewInstance={handleNewInstance}
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
