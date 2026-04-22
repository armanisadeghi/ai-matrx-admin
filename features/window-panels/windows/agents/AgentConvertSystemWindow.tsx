"use client";

/**
 * AgentConvertSystemWindow
 *
 * Floating window wrapping `ConvertAgentToSystemBody`. Lets an admin promote
 * the active agent to a system ("builtin") agent, or refresh an existing
 * system agent with the current definition.
 *
 * Replaces the previous `AgentConvertSystemWindow` placeholder — the overlay
 * id (`agentConvertSystemWindow`) and registry slug (`agent-convert-system-window`)
 * are preserved so the menu dispatcher (`openAgentConvertSystemWindow`) and
 * existing persisted sessions keep working.
 */

import { Link2 } from "lucide-react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { AgentComingSoonContent } from "@/features/agents/components/coming-soon/AgentComingSoonContent";
import { ConvertAgentToSystemBody } from "@/features/agents/components/admin/ConvertAgentToSystemBody";

interface AgentConvertSystemWindowProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string | null;
}

const WINDOW_ID = "agent-convert-system-window";
const OVERLAY_ID = "agentConvertSystemWindow";

export default function AgentConvertSystemWindow({
  isOpen,
  onClose,
  agentId,
}: AgentConvertSystemWindowProps) {
  if (!isOpen) return null;

  if (!agentId) {
    return (
      <WindowPanel
        id={WINDOW_ID}
        title="Convert to System Agent"
        onClose={onClose}
        width={520}
        height={360}
        minWidth={420}
        minHeight={300}
        overlayId={OVERLAY_ID}
      >
        <AgentComingSoonContent
          icon={Link2}
          title="No agent selected"
          description="Open this window from an agent's actions menu to promote it to a system agent."
          agentId={null}
        />
      </WindowPanel>
    );
  }

  return (
    <WindowPanel
      id={WINDOW_ID}
      title="Convert to System Agent"
      onClose={onClose}
      width={620}
      height={580}
      minWidth={480}
      minHeight={420}
      overlayId={OVERLAY_ID}
      bodyClassName="p-0"
    >
      <ConvertAgentToSystemBody agentId={agentId} onClose={onClose} />
    </WindowPanel>
  );
}
