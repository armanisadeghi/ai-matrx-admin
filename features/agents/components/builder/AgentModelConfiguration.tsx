"use client";

/**
 * AgentModelConfiguration
 *
 * Model selector row with inline controls (Variables, Tools, Settings).
 * Uses AiModelSelect — data fetching (options + full record) is fully internal.
 * All writes go through Redux.
 */

import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentModelId,
  selectAgentSettings,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentField } from "@/features/agents/redux/agent-definition/slice";
import { AgentSettingsModal } from "@/features/agents/components/settings/AgentSettingsModal";
import { AgentVariablesModal } from "@/features/agents/components/settings/AgentVariablesModal";
import { AgentToolsModal } from "@/features/agents/components/settings/AgentToolsModal";
import { Label } from "@/components/ui/label";
import { SmartModelSelect } from "@/features/ai-models/components/smart/SmartModelSelect";

interface AgentModelConfigurationProps {
  agentId: string;
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentModelConfiguration({
  agentId,
  availableTools = [],
}: AgentModelConfigurationProps) {
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
    <div className="flex items-center gap-3">
      <Label className="text-xs text-gray-600 dark:text-gray-400">Model</Label>
      <SmartModelSelect value={modelId} onValueChange={handleModelChange} />
      <AgentSettingsModal agentId={agentId} />
      <AgentVariablesModal agentId={agentId} />
      <AgentToolsModal agentId={agentId} availableTools={availableTools} />
    </div>
  );
}
