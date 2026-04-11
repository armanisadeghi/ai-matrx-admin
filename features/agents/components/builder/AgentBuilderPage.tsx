import { AgentBuilderClient } from "./AgentBuilderClient";
import { AgentBuilderDesktop } from "./AgentBuilderDesktop";
import { DesktopBuilderSkeleton } from "./AgentBuilderSkeletons";

interface AgentBuilderPageProps {
  agentId: string;
}

export function AgentBuilderPage({ agentId }: AgentBuilderPageProps) {
  return (
    <div className="h-full overflow-hidden">
      <AgentBuilderClient
        agentId={agentId}
        desktopContent={<AgentBuilderDesktop agentId={agentId} />}
        fallback={<DesktopBuilderSkeleton />}
      />
    </div>
  );
}
