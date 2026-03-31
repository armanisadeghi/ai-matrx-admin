"use client";

/**
 * AgentModelConfiguration
 *
 * Smart component — reads modelId and settings from the active agent in Redux
 * and renders the shared ModelSettings panel. No content props.
 *
 * Pass `models` and `availableTools` as regular props (from server component fetch).
 */

import { useCallback } from "react";
import { Cpu } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentModelId,
  selectAgentSettings,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentField } from "@/features/agents/redux/agent-definition/slice";

interface AgentModelConfigurationProps {
  models: Array<{ id: string; name?: string; [key: string]: unknown }>;
  availableTools?: unknown[];
}

export function AgentModelConfiguration({
  models,
  availableTools = [],
}: AgentModelConfigurationProps) {
  const dispatch = useAppDispatch();
  const agentId = useAppSelector(selectActiveAgentId);
  const modelId = useAppSelector((state) =>
    agentId ? selectAgentModelId(state, agentId) : null,
  );

  const handleModelChange = useCallback(
    (newModelId: string) => {
      if (!agentId) return;
      dispatch(
        setAgentField({ id: agentId, field: "modelId", value: newModelId }),
      );
    },
    [agentId, dispatch],
  );

  if (!agentId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Model</Label>
      </div>

      <Select value={modelId ?? ""} onValueChange={handleModelChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model..." />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={String(m.id)} value={String(m.id)}>
              {String(m.name ?? m.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {modelId && (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          <code className="bg-muted px-1 rounded text-[10px]">{modelId}</code>
        </p>
      )}
    </div>
  );
}
