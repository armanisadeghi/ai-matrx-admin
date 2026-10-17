"use client";

import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { isPreparedResourceIdentity } from "@ai-matrx/chat/agents/components/chat/usePreparedResourceSeed";
import AgentRunWindow from "@ai-matrx/chat/window-panels/windows/agents/AgentRunWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <AgentRunWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            initialAgentId={
              typeof data?.initialAgentId === "string"
                ? data.initialAgentId
                : null
            }
            initialSelectedConversationId={
              typeof data?.initialSelectedConversationId === "string"
                ? data.initialSelectedConversationId
                : null
            }
            initialAgentName={
              typeof data?.initialAgentName === "string"
                ? data.initialAgentName
                : null
            }
            initialDraftText={
              typeof data?.initialDraftText === "string"
                ? data.initialDraftText
                : null
            }
            initialVariableValues={
              data?.initialVariableValues &&
              typeof data.initialVariableValues === "object"
                ? (data.initialVariableValues as Record<string, string>)
                : null
            }
            initialToolsOpen={data?.initialToolsOpen === true}
            initialResources={
              Array.isArray(data?.initialResources)
                ? (data.initialResources as import("@ai-matrx/chat/agents/resources/types").Resource[])
                : null
            }
            initialResourceIdentity={
              isPreparedResourceIdentity(data?.initialResourceIdentity)
                ? data.initialResourceIdentity as { userId: string; organizationId: string }
                : null
            }
            initialAutoRun={data?.initialAutoRun === true}
            mandateKey={
              typeof data?.mandateKey === "string"
                ? storedMandateKey(data.mandateKey)
                : null
            }
            surfaceName={
              typeof data?.surfaceName === "string" ? data.surfaceName : null
            }
            seedNonce={
              typeof data?.seedNonce === "number" ? data.seedNonce : null
            }
          />
        );
}
