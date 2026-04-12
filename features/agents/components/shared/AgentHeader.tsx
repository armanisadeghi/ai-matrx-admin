import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AgentSelectorIsland } from "./AgentSelectorIsland";
import { AgentModeController } from "./AgentModeController";
import { AgentSaveStatus } from "./AgentSaveStatus";
import { AgentOptionsMenu } from "./AgentOptionsMenu";
import { AgentHeaderMobile } from "./AgentHeaderMobile";

interface AgentHeaderProps {
  agentId: string;
  /** Agent name from the SSR fetch — passed to the selector island so the
   *  initial render shows the real name with zero flash or loading state. */
  agentName: string;
}

/**
 * Server Component shell for the agent detail header.
 *
 * Desktop: text-based selector + labelled mode buttons + save/options.
 * Mobile: tap-target icons only — Webhook (agent picker) | 5-icon group | menu.
 * Breakpoint split via CSS hidden classes — no client hook needed.
 */
export function AgentHeader({ agentId, agentName }: AgentHeaderProps) {
  return (
    <>
      {/* ── Mobile layout (< lg) ─────────────────────────────────────────── */}
      <div className="lg:hidden w-full">
        <AgentHeaderMobile agentId={agentId} agentName={agentName} />
      </div>

      {/* ── Desktop layout (>= lg) ───────────────────────────────────────── */}
      <div className="hidden lg:flex items-center justify-between w-full gap-2 px-1">
        <div className="flex items-center gap-1">
          <Link
            href="/agents"
            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label="Back to Agents"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <AgentSelectorIsland agentId={agentId} initialName={agentName} />
        </div>
        <AgentModeController agentId={agentId} />
        <div className="flex items-center gap-1.5 shrink-0">
          <AgentSaveStatus agentId={agentId} />
          <div className="w-px h-4 bg-border/50" />
          <AgentOptionsMenu agentId={agentId} />
        </div>
      </div>
    </>
  );
}
