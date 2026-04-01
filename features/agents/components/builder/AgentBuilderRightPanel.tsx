"use client";

/**
 * AgentBuilderRightPanel — Test Run Panel
 *
 * Uses createManualInstance which reads from agentDefinition.agents[agentId] —
 * including dirty (unsaved) fields. So the test run always reflects the
 * current in-memory builder state, whether saved or not.
 *
 * When the user resets, the old instance is destroyed and a new one is
 * created, snapshotting the latest builder state again.
 */

import { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { destroyInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.slice";
import { AgentConversationDisplay } from "../run/AgentConversationDisplay";
import { SmartAgentInput } from "../smart";
import { RotateCcw, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentBuilderRightPanelProps {
  agentId: string;
}

export function AgentBuilderRightPanel({
  agentId,
}: AgentBuilderRightPanelProps) {
  const dispatch = useAppDispatch();
  const record = useAppSelector((state) => selectAgentById(state, agentId));
  const [instanceId, setInstanceId] = useState<string | null>(null);

  // Create instance on mount (snapshots current builder state)
  useEffect(() => {
    let createdId: string | null = null;

    dispatch(createManualInstance({ agentId, autoClearConversation: true }))
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
    // Re-run only when agentId changes (user switches agents)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleReset = useCallback(() => {
    // Destroy current instance and create a fresh one that
    // re-snapshots the latest builder state (including unsaved edits)
    if (instanceId) {
      dispatch(destroyInstance(instanceId));
      setInstanceId(null);
    }

    dispatch(createManualInstance({ agentId, autoClearConversation: true }))
      .unwrap()
      .then((id) => setInstanceId(id))
      .catch((err) => console.error("Failed to reset test instance:", err));
  }, [instanceId, agentId, dispatch]);

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-card max-w-[780px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Test Run</span>
          {record?.name && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              — {record.name}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleReset}
          disabled={!instanceId}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </Button>
      </div>

      {instanceId ? (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <AgentConversationDisplay instanceId={instanceId} />
          </div>

          {/* SmartAgentInput includes variable panel, resource chips, and auto-clear toggle */}
          <div className="px-3 pb-3 pt-2 border-t border-border">
            <SmartAgentInput
              instanceId={instanceId}
              showAutoClearToggle
              showSubmitOnEnterToggle
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Initializing...
        </div>
      )}
    </div>
  );
}
