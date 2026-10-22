"use client";

import { StreamDebugFloating } from "@ai-matrx/chat/agents/components/debug/StreamDebugFloating";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <StreamDebugFloating
            onClose={() => close()}
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : ""
            }
            defaultPosition={
              (Array.isArray(data?.defaultPosition) ||
              (typeof data?.defaultPosition === "object" &&
                data?.defaultPosition !== null)
                ? data.defaultPosition
                : undefined) as never
            } /* TODO: review — anonymous inline { x: number; y: number } */
            requestIdOverride={
              typeof data?.requestIdOverride === "string"
                ? data.requestIdOverride
                : undefined
            }
          />
        );
}
