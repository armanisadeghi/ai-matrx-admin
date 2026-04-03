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
    <div className="flex gap-4 h-full">
      {/* Left: Edit panel — capped at 640px */}
      <div className="h-full overflow-hidden w-full max-w-[640px] shrink-0">
        <AgentBuilderLeftPanel
          agentId={agentId}
          availableTools={availableTools}
        />
      </div>
      {/* Right: Test panel — takes remaining space, contents centered */}
      <div className="flex-1 h-full overflow-hidden flex justify-center">
        <div className="w-full max-w-3xl h-full">
          <AgentBuilderRightPanel agentId={agentId} />
        </div>
      </div>
    </div>
  );
}
