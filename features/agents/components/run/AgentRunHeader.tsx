import { AgentModeController } from "../shared/AgentModeController";
import { AgentSaveStatus } from "../shared/AgentSaveStatus";
import { AgentOptionsMenu } from "../shared/AgentOptionsMenu";
import Link from "next/link";
import { AgentSelectorIsland } from "../shared/AgentSelectorIsland";
import { ChevronLeftTapButton } from "@/components/icons/tap-buttons";
import { AgentNewRunButton } from "../shared/AgentNewRunButton";

interface AgentRunHeaderProps {
  agentId: string;
  agentName: string;
  conversationId: string;
  surfaceKey: string;
  conversationIdFromUrl?: string;
  /** Back-link target. Defaults to `/agents`. Admin passes
   *  `/administration/system-agents/agents`. */
  backHref?: string;
  /** Base path for mode-switch navigation. Defaults to `/agents`. */
  basePath?: string;
}

export function AgentRunHeader({
  agentId,
  agentName,
  conversationId,
  surfaceKey,
  conversationIdFromUrl,
  backHref = "/agents",
  basePath = "/agents",
}: AgentRunHeaderProps) {
  return (
    <div className="hidden lg:flex items-center justify-between w-full gap-2 shrink-0 pr-12">
      <div className="flex items-center">
        <Link href={backHref} aria-label="Back to Agents">
          <ChevronLeftTapButton />
        </Link>

        {/* Agent selector — shows current agent, lets you switch */}
        <AgentSelectorIsland agentId={agentId} initialName={agentName} />
        <AgentNewRunButton
          agentId={agentId}
          conversationId={conversationId}
          surfaceKey={surfaceKey}
        />
      </div>
      <div>
        <AgentModeController agentId={agentId} basePath={basePath} />
      </div>
      <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
        <AgentSaveStatus agentId={agentId} />
        <AgentOptionsMenu agentId={agentId} />
      </div>
    </div>
  );
}
