"use client";

/**
 * AgentBuilder
 *
 * Main orchestrator for the agent edit page.
 * The layout SSR hydrates Redux via AgentHydrator — selectAgentReadyForBuilder
 * is true on mount, so no client-side fetch is needed.
 * Renders a skeleton only as a safety fallback, then lazy-loads
 * AgentBuilderDesktop or AgentBuilderMobile based on viewport.
 */

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentReadyForBuilder } from "@/features/agents/redux/agent-definition/selectors";
import { useAgentAutoSave } from "@/features/agents/hooks/useAgentAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy-loaded only after the record is confirmed fully loaded.
// This keeps both builders out of the initial bundle and prevents
// any render attempt before the required Redux data exists.
const AgentBuilderDesktop = dynamic(
  () =>
    import("./AgentBuilderDesktop").then((m) => ({
      default: m.AgentBuilderDesktop,
    })),
  { ssr: false },
);
const AgentBuilderMobile = dynamic(
  () =>
    import("./AgentBuilderMobile").then((m) => ({
      default: m.AgentBuilderMobile,
    })),
  { ssr: false },
);

interface AgentBuilderProps {
  agentId: string;
}

export function AgentBuilder({ agentId }: AgentBuilderProps) {
  const isMobile = useIsMobile();

  const isReadyForBuilder = useAppSelector((state) =>
    selectAgentReadyForBuilder(state, agentId),
  );

  useAgentAutoSave(agentId);

  return (
    <div className="h-full overflow-hidden">
      {!isReadyForBuilder ? (
        <AgentBuilderSkeleton isMobile={isMobile} />
      ) : isMobile ? (
        <AgentBuilderMobile agentId={agentId} />
      ) : (
        <AgentBuilderDesktop agentId={agentId} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — matches the layout of AgentBuilderDesktop / AgentBuilderMobile
// so there is zero layout shift when the builder mounts.
// ---------------------------------------------------------------------------

function AgentBuilderSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="flex-1 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col gap-3 h-full">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="flex-1 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 h-full">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="flex-1 w-full rounded-lg" />
      </div>
    </div>
  );
}
