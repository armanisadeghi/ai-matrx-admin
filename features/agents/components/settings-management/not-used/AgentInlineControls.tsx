"use client";

/**
 * AgentInlineControls
 *
 * Thin toolbar rendered next to the model picker in the builder.
 * Contains three icon buttons: Variables, Tools, Settings.
 * Each opens its own modal.
 *
 * Usage:
 *   <AgentInlineControls agentId={agentId} availableTools={tools} />
 */

import { AgentVariablesModal } from "../../variables-management/AgentVariablesModal";
import { AgentToolsModal } from "../../tools-management/AgentToolsModal";
import { AgentSettingsModal } from "../AgentSettingsModal";
import { setAgentField } from "../../../redux/agent-definition/slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAgentModelId } from "../../../redux/agent-definition/selectors";
import { useCallback } from "react";
import { SmartModelSelect } from "@/features/ai-models/components/smart/SmartModelSelect";
import { Label } from "@/components/ui/label";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

interface AgentInlineControlsProps {
  agentId: string;
  availableTools?: DatabaseTool[];
}

export function AgentInlineControls({
  agentId,
  availableTools = [],
}: AgentInlineControlsProps) {
  const dispatch = useAppDispatch();
  const modelId = useAppSelector((state) => selectAgentModelId(state, agentId));

  const handleModelChange = useCallback(
    (newModelId: string) => {
      dispatch(
        setAgentField({ id: agentId, field: "modelId", value: newModelId }),
      );
    },
    [agentId, dispatch],
  );

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-3">
        <Label className="text-xs text-gray-600 dark:text-gray-400">
          Model
        </Label>
        <SmartModelSelect value={modelId} onValueChange={handleModelChange} />
      </div>
      <AgentVariablesModal agentId={agentId} />
      <AgentToolsModal agentId={agentId} availableTools={availableTools} />
      <AgentSettingsModal agentId={agentId} />
    </div>
  );
}
