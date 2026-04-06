"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectInstanceAgentId,
  selectInstanceShortcutId,
} from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectAgentName } from "@/features/agents/redux/agent-definition/selectors";

/**
 * Layered title resolution for an agent instance.
 *
 * 1. Read agentId from the instance (primitive string → stable).
 * 2. Read shortcutId from the instance (primitive string | null → stable).
 * 3. Use the established selectAgentName selector (memoized via createSelector).
 * 4. Read shortcut label from the shortcut slice.
 * 5. Return shortcutLabel ?? agentName ?? undefined.
 *
 * Each useAppSelector call returns a primitive, so only the selector whose
 * input actually changed will trigger a re-render.
 */
export function useInstanceTitle(instanceId: string): string | undefined {
  const agentId = useAppSelector(selectInstanceAgentId(instanceId));
  const shortcutId = useAppSelector(selectInstanceShortcutId(instanceId));

  const agentName = useAppSelector((state) => {
    if (!agentId) return undefined;
    const allAgents = state.agentDefinition.agents;
    const record = allAgents?.[agentId];
    console.log(
      "[useInstanceTitle] agentId:",
      agentId,
      "| record exists:",
      !!record,
      "| name:",
      record?.name,
      "| agents keys sample:",
      Object.keys(allAgents ?? {}).slice(0, 3),
    );
    return selectAgentName(state, agentId);
  });

  const shortcutLabel = useAppSelector((state) =>
    shortcutId ? state.agentShortcut?.[shortcutId]?.label : undefined,
  );

  console.log(
    "[useInstanceTitle] instanceId:",
    instanceId,
    "| agentId:",
    agentId,
    "| shortcutId:",
    shortcutId,
    "| agentName:",
    agentName,
    "| shortcutLabel:",
    shortcutLabel,
  );

  return shortcutLabel || agentName || undefined;
}
