"use client";

/**
 * AgentSkillsButton
 *
 * Toolbar trigger in the agent builder that opens the non-blocking
 * `agentSkillsWindow` floating panel (see
 * `features/window-panels/windows/agents/AgentSkillsWindow.tsx`).
 *
 * Replaced the old `AgentSkillsModal` — a blocking Dialog that trapped the
 * user while they browsed the catalog. The window keeps the builder usable
 * underneath, and the picker itself now opens each skill's full instructions.
 */

import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@ai-matrx/summon/open";
import { useOpenAgentSkillsWindow } from "@/features/overlays/definitions/agentSkillsWindow.overlay";
import { selectAgentSkillConfig } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";

interface AgentSkillsButtonProps {
  agentId: string;
}

export function AgentSkillsButton({ agentId }: AgentSkillsButtonProps) {
  const openSkillsWindow = useOpenAgentSkillsWindow();
  const skillConfig = useAppSelector((state) =>
    selectAgentSkillConfig(state, agentId),
  );
  const isOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "agentSkillsWindow"),
  );

  const totalCount =
    skillConfig.included.length +
    skillConfig.listed.length +
    skillConfig.forbidden.length;

  return (
    <Button
      variant="quiet"
      icon={<Lightbulb />}
      pressed={isOpen}
      badge={totalCount}
      onClick={() => openSkillsWindow(agentId)}
      title="Skills"
      aria-label="Skills"
    />
  );
}
