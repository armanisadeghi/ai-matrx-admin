"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentById,
  selectAgentVersionNumber,
} from "@/features/agents/redux/agent-definition/selectors";
import { AgentListDropdown } from "@/features/agents/components/agent-listings/AgentListDropdown";

function deriveModeSuffix(pathname: string, agentId: string): string {
  const base = `/agents/${agentId}`;
  if (pathname.startsWith(`${base}/run`)) return "/run";
  if (pathname.startsWith(`${base}/build`)) return "/build";
  if (
    pathname.startsWith(`${base}/latest`) ||
    /^\/agents\/[^/]+\/\d+$/.test(pathname)
  )
    return "/latest";
  return "";
}

interface AgentSelectorIslandProps {
  agentId: string;
  /** SSR-provided name shown on first paint; replaced by Redux value once hydrated */
  initialName: string;
  /** Custom trigger element — replaces the default text button inside AgentListDropdown */
  triggerSlot?: React.ReactNode;
}

export function AgentSelectorIsland({
  agentId,
  initialName,
  triggerSlot,
}: AgentSelectorIslandProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  // Once Redux is hydrated this provides the live name; before that, initialName is used
  const liveAgentName = useAppSelector(
    (state) => selectAgentById(state, agentId)?.name,
  );
  const versionNumber = useAppSelector((state) =>
    selectAgentVersionNumber(state, agentId),
  );

  const displayName = liveAgentName ?? initialName;

  const handleAgentSelect = (selectedId: string) => {
    const suffix = deriveModeSuffix(pathname, agentId);
    startTransition(() => router.push(`/agents/${selectedId}${suffix}`));
  };

  return (
    <div className="flex items-center gap-2 min-w-0 shrink">
      <AgentListDropdown
        onSelect={handleAgentSelect}
        label={displayName}
        className="max-w-[120px] md:max-w-[180px]"
        triggerSlot={triggerSlot}
      />
      {versionNumber != null && (
        <span className="text-[0.625rem] font-medium text-[var(--shell-nav-text)] tabular-nums shrink-0">
          v{versionNumber}
        </span>
      )}
    </div>
  );
}
