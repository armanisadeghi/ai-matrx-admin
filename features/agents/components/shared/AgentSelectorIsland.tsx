"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentVersion,
} from "@/features/agents/redux/agent-definition/selectors";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";
import {
  deriveAgentMode,
  getAgentModeHref,
} from "./AgentModeController";

interface AgentSelectorIslandProps {
  agentId: string;
  /** SSR-provided name shown on first paint; replaced by Redux value once hydrated */
  initialName: string;
  /** Custom trigger element — replaces the default text button inside AgentListDropdown */
  triggerSlot?: React.ReactNode;
  /** Base path for routing. Defaults to `/agents`. Admin surfaces pass
   *  `/administration/system-agents/agents`. Used to keep the user inside
   *  their current surface when switching agents. */
  basePath?: string;
}

export function AgentSelectorIsland({
  agentId,
  initialName,
  triggerSlot,
  basePath = "/agents",
}: AgentSelectorIslandProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  // Once Redux is hydrated this provides the live name; before that, initialName is used
  const liveAgentName = useAppSelector(
    (state) => selectAgentById(state, agentId)?.name,
  );
  const version = useAppSelector((state) =>
    selectAgentVersion(state, agentId),
  );

  const displayName = liveAgentName ?? initialName;

  const handleAgentSelect = (selectedId: string) => {
    if (selectedId === agentId) return;
    const currentMode = deriveAgentMode(pathname, agentId, basePath);
    const nextHref = getAgentModeHref(currentMode, selectedId, basePath);
    startTransition(() => router.push(nextHref));
  };

  return (
    <div className="flex items-center gap-2 min-w-0 shrink">
      <AgentListDropdown
        onSelect={handleAgentSelect}
        label={displayName}
        className="max-w-[120px] md:max-w-[180px] py-3.5 rounded-full matrx-shell-glass"
        triggerSlot={triggerSlot}
      />
      {version != null && (
        <span className="text-[0.625rem] font-medium text-[var(--shell-nav-text)] tabular-nums shrink-0">
          v{version}
        </span>
      )}
    </div>
  );
}
