import { AgentBuilderLeftPanel } from "./AgentBuilderLeftPanel";
import { AgentBuilderRightPanel } from "./AgentBuilderRightPanel";

interface AgentBuilderDesktopProps {
  agentId: string;
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentBuilderDesktop({
  agentId,
  availableTools = [],
}: AgentBuilderDesktopProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Left: Edit panel */}
      <div className="h-full overflow-hidden max-w-[640px]">
        <AgentBuilderLeftPanel
          agentId={agentId}
          availableTools={availableTools}
        />
      </div>
      {/* Right: Test panel */}
      <div className="h-full overflow-hidden">
        <AgentBuilderRightPanel agentId={agentId} />
      </div>
    </div>
  );
}
