import { AgentBuilderLeftPanel } from "./AgentBuilderLeftPanel";
import { AgentBuilderRightPanel } from "./AgentBuilderRightPanel";

interface AgentBuilderDesktopProps {
  agentId: string;
}

export function AgentBuilderDesktop({ agentId }: AgentBuilderDesktopProps) {
  return (
    <div className="flex h-full">
      <div
        className="h-full overflow-hidden w-full max-w-[640px] shrink-0 px-2"
        style={{ paddingTop: "var(--shell-header-h)" }}
      >
        <AgentBuilderLeftPanel agentId={agentId} />
      </div>
      <div className="flex-1 h-full overflow-hidden flex justify-center">
        <div className="w-full max-w-3xl h-full pt-12">
          <AgentBuilderRightPanel agentId={agentId} />
        </div>
      </div>
    </div>
  );
}
