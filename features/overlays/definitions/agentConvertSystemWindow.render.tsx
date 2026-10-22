"use client";

import AgentConvertSystemWindow from "@/features/window-panels/windows/agents/AgentConvertSystemWindow";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AgentConvertSystemWindow
            isOpen
            onClose={() =>
              close()
            }
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
            mandateId={
              typeof data?.mandateId === "string" ? data.mandateId : null
            }
            mandateKey={
              typeof data?.mandateKey === "string"
                ? storedMandateKey(data.mandateKey)
                : null
            }
            mandateLabel={
              typeof data?.mandateLabel === "string" ? data.mandateLabel : null
            }
          />
        );
}
