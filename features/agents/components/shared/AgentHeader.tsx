import { AgentSelectorIsland } from "./AgentSelectorIsland";
import { AgentModeController } from "./AgentModeController";
import { AgentSaveStatus } from "./AgentSaveStatus";
import { AgentOptionsMenu } from "./AgentOptionsMenu";

interface AgentHeaderProps {
  agentId: string;
  /** Agent name from the SSR fetch — passed to the selector island so the
   *  initial render shows the real name with zero flash or loading state. */
  agentName: string;
}

/**
 * Server Component shell for the agent detail header.
 *
 * The outer flex layout, dividers, and positioning are all server-rendered.
 * The three interactive islands are minimal client boundaries:
 *   - AgentSelectorIsland  → agent dropdown + version badge
 *   - AgentModeController  → 5 mode buttons + dirty-navigation dialog
 *   - AgentSaveStatus      → save button (edit mode only)
 *   - AgentOptionsMenu     → overflow menu
 */
export function AgentHeader({ agentId, agentName }: AgentHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full gap-2 px-1">
      {/* Left: agent selector dropdown */}
      <AgentSelectorIsland agentId={agentId} initialName={agentName} />

      {/* Center: mode switcher (View / Build / Run / Versions / New) */}
      <AgentModeController agentId={agentId} />

      {/* Right: save status + options menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        <AgentSaveStatus agentId={agentId} />
        <div className="w-px h-4 bg-border/50" />
        <AgentOptionsMenu agentId={agentId} />
      </div>
    </div>
  );
}
