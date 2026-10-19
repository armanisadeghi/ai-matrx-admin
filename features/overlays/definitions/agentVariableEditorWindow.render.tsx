"use client";

import AgentVariableEditorWindow from "@/features/agents/components/variables-management/AgentVariableEditorWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const raw = data;
        if (
          !raw ||
          typeof raw.agentId !== "string" ||
          typeof raw.variableName !== "string"
        )
          return <OverlayNeedsData overlayId="agentVariableEditorWindow" onClose={close} />;
        return (
          <AgentVariableEditorWindow
            isOpen
            onClose={() =>
              close()
            }
            data={{
              agentId: raw.agentId,
              variableName: raw.variableName,
              justCreated: raw.justCreated === true,
            }}
          />
        );
}
