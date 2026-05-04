"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentType,
  selectAgentVersion,
} from "@/features/agents/redux/agent-definition/selectors";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";
import { deriveAgentMode, getAgentModeHref } from "./AgentModeController";

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
  const version = useAppSelector((state) => selectAgentVersion(state, agentId));
  const agentType = useAppSelector((state) => selectAgentType(state, agentId));
  const isBuiltin = agentType === "builtin";

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
        className="max-w-[120px] md:max-w-[180px] py-2 border border-red-500 rounded-full shell-glass"
        triggerSlot={triggerSlot}
      />
      {version != null && (
        <span className="text-[0.625rem] font-medium text-[var(--shell-nav-text)] tabular-nums shrink-0">
          v{version}
        </span>
      )}
      {isBuiltin && (
        <span
          className="text-[0.625rem] font-semibold uppercase tracking-wider leading-none px-1.5 py-0.5 rounded-full border border-destructive/40 bg-destructive/10 text-destructive shrink-0"
          title="System-owned agent — edits affect all users"
        >
          Builtin
        </span>
      )}
    </div>
  );
}
