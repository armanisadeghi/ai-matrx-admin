import { AgentModeController } from "../shared/AgentModeController";
import { AgentSaveStatus } from "../shared/AgentSaveStatus";
import { AgentOptionsMenu } from "../shared/AgentOptionsMenu";

interface AgentRunHeaderProps {
  agentId: string;
  conversationId: string;
  surfaceKey: string;
  conversationIdFromUrl?: string;
}

export function AgentRunHeader({
  agentId,
  conversationId,
  surfaceKey,
  conversationIdFromUrl,
}: AgentRunHeaderProps) {
  return (
    <div className="hidden lg:flex items-center justify-between w-full gap-2 px-2 pr-12 shrink-0">
      <div className="flex items-center gap-2"></div>
      <div className="pt-2">
        <AgentModeController agentId={agentId} />
      </div>
      <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
        <AgentSaveStatus agentId={agentId} />
        <AgentOptionsMenu agentId={agentId} />
      </div>
    </div>
  );
}
