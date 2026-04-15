import { AgentModeController } from "../shared/AgentModeController";
import { AgentSaveStatus } from "../shared/AgentSaveStatus";
import { AgentOptionsMenu } from "../shared/AgentOptionsMenu";
import { SidebarHeader } from "./SidebarHeader";

interface AgentRunHeaderProps {
  agentId: string;
  conversationId: string;
  surfaceKey: string;
  conversationIdFromUrl?: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * Server Component shell for the agent detail header.
 *
 * Desktop: text-based selector + labelled mode buttons + save/options.
 * Mobile: tap-target icons only — Webhook (agent picker) | 5-icon group | menu.
 * Breakpoint split via CSS hidden classes — no client hook needed.
 */
export function AgentRunHeader({
  agentId,
  conversationId,
  surfaceKey,
  conversationIdFromUrl,
  sidebarOpen,
  onToggleSidebar,
}: AgentRunHeaderProps) {
  return (
    <>
      {/* ── Desktop layout (>= lg) ───────────────────────────────────────── */}
      <div className="hidden lg:flex items-start justify-between w-full gap-0 px-0 pr-12">
        <div className="flex items-center flex-1 min-w-0 max-w-64">
          {!sidebarOpen && (
            <SidebarHeader
              agentId={agentId}
              conversationId={conversationId}
              surfaceKey={surfaceKey}
              conversationIdFromUrl={conversationIdFromUrl}
              onToggleSidebar={onToggleSidebar}
            />
          )}
        </div>
        <div className="pt-2">
          <AgentModeController agentId={agentId} />
        </div>
        <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
          <AgentSaveStatus agentId={agentId} />
          <AgentOptionsMenu agentId={agentId} />
        </div>
      </div>
    </>
  );
}
