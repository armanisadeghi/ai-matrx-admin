"use client";

/**
 * AgentToolsManager
 *
 * Smart component — manages built-in and custom tool selections for the active agent.
 * Reads/writes directly through Redux.
 */

import { useCallback } from "react";
import { Wrench } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentTools,
  selectAgentCustomTools,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentTools } from "@/features/agents/redux/agent-definition/slice";

interface AgentToolsManagerProps {
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentToolsManager({
  availableTools = [],
}: AgentToolsManagerProps) {
  const dispatch = useAppDispatch();
  const agentId = useAppSelector(selectActiveAgentId);
  const selectedTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );
  const customTools = useAppSelector((state) =>
    selectAgentCustomTools(state, agentId),
  );

  const toggleTool = useCallback(
    (toolName: string) => {
      if (!agentId) return;
      const current = Array.isArray(selectedTools)
        ? (selectedTools as string[])
        : [];
      const next = current.includes(toolName)
        ? current.filter((t) => t !== toolName)
        : [...current, toolName];
      dispatch(
        setAgentTools({
          id: agentId,
          tools: next as unknown as typeof selectedTools,
        }),
      );
    },
    [agentId, selectedTools, dispatch],
  );

  if (!agentId) return null;

  const activeTool = new Set(
    Array.isArray(selectedTools) ? (selectedTools as string[]) : [],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Tools</Label>
        {activeTool.size > 0 && (
          <span className="text-xs text-muted-foreground">
            ({activeTool.size} enabled)
          </span>
        )}
      </div>

      {availableTools.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">No tools available.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableTools.map((tool) => {
            const name = String(tool.name);
            const isActive = activeTool.has(name);
            return (
              <button
                key={name}
                onClick={() => toggleTool(name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary/40 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
                title={tool.description ? String(tool.description) : undefined}
              >
                <Wrench
                  className={`w-2.5 h-2.5 ${isActive ? "text-primary" : ""}`}
                />
                {name}
              </button>
            );
          })}
        </div>
      )}

      {customTools && customTools.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Custom Tools
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(customTools as Array<{ name?: string }>).map((ct, i) => (
              <Badge
                key={ct.name ?? i}
                variant="secondary"
                className="text-[11px]"
              >
                {ct.name ?? `tool-${i}`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
