import { AgentBuilderClient } from "./AgentBuilderClient";
import { AgentBuilderDesktop } from "./AgentBuilderDesktop";
import { DesktopBuilderSkeleton } from "./AgentBuilderSkeletons";

interface AgentBuilderProps {
  agentId: string;
}

export function AgentBuilder({ agentId }: AgentBuilderProps) {
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
