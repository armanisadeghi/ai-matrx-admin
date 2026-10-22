"use client";

/**
 * AgentSamplesLauncher — ONE small floating icon that opens the agent's test
 * cases (agent.exemplar) in a WindowPanel. Builder-only by Arman's ruling
 * (2026-08-26): the earlier full-width chip strip sat on top of the run
 * surfaces and was ripped out — samples must never add page chrome. Picking a
 * sample ("Use") prefills variables, human text, and every canonical structured
 * input part through the SAME slices the live composer uses. The sample's
 * user_input is still only human-typed text; attachments remain message parts,
 * so this does not violate the USER-INPUT LAW.
 */

import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOpenAgentTestCasesWindow } from "@/features/overlays/definitions/agentTestCasesWindow.overlay";

export interface AgentSamplesLauncherProps {
  agentId: string;
  /** The live test instance a chosen sample prefills. */
  conversationId: string;
  /** Layout classes from the host. */
  className?: string;
}

export function AgentSamplesLauncher({
  agentId,
  conversationId,
  className,
}: AgentSamplesLauncherProps) {
  const openTestCases = useOpenAgentTestCasesWindow();

  return (
    <div className={cn("flex justify-end", className)}>
      <Button
        icon={<FlaskConical />}
        variant="quiet"
        title="Samples"
        aria-label="Open samples"
        onClick={() => openTestCases({ agentId, conversationId })}
      />
    </div>
  );
}
