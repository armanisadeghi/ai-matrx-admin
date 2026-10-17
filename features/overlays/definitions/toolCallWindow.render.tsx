"use client";

import type { ToolLifecycleEntry } from "@ai-matrx/chat/agents/types/request.types";
import ToolCallWindowPanel from "@ai-matrx/chat/tool-call-visualization/window-panel/ToolCallWindowPanel";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <ToolCallWindowPanel
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            requestId={
              typeof data?.requestId === "string" ? data.requestId : null
            }
            callIds={
              Array.isArray(data?.callIds) &&
              data.callIds.every((v) => typeof v === "string")
                ? (data.callIds as string[])
                : []
            }
            entries={data?.entries as ToolLifecycleEntry[] | null}
            initialCallId={
              typeof data?.initialCallId === "string"
                ? data.initialCallId
                : null
            }
            initialTab={
              typeof data?.initialTab === "string" ? data.initialTab : null
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : null
            }
            readOnly={data?.readOnly === true}
          />
        );
}
