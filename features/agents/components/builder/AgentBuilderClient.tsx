"use client";

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentReadyForBuilder } from "@/features/agents/redux/agent-definition/selectors";
import { useAgentAutoSave } from "@/features/agents/hooks/useAgentAutoSave";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBuilderSkeleton } from "./AgentBuilderSkeletons";

const AgentBuilderMobile = dynamic(
  () =>
    import("./AgentBuilderMobile").then((m) => ({
      default: m.AgentBuilderMobile,
    })),
  { ssr: false, loading: () => <MobileBuilderSkeleton /> },
);

interface AgentBuilderClientProps {
  agentId: string;
  desktopContent: React.ReactNode;
  fallback: React.ReactNode;
}

export function AgentBuilderClient({
  agentId,
  desktopContent,
  fallback,
}: AgentBuilderClientProps) {
  const isMobile = useIsMobile();
  const isReady = useAppSelector((state) =>
    selectAgentReadyForBuilder(state, agentId),
  );

  useAgentAutoSave(agentId);

  if (!isReady) return <>{fallback}</>;

  if (isMobile) return <AgentBuilderMobile agentId={agentId} />;

  return <>{desktopContent}</>;
}
