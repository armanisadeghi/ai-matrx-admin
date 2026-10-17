"use client";

import { parseLiveRunProgressState } from "@ai-matrx/chat/agents/components/live-run/LiveRunProgress";
import LiveRunWindow from "@ai-matrx/chat/window-panels/windows/agents/LiveRunWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <LiveRunWindow
            key={instanceId}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            onClose={() =>
              close()
            }
            conversationId={
              typeof data?.conversationId === "string"
                ? data.conversationId
                : null
            }
            requestId={
              typeof data?.requestId === "string" ? data.requestId : null
            }
            runSetKey={
              typeof data?.runSetKey === "string" ? data.runSetKey : null
            }
            label={typeof data?.label === "string" ? data.label : null}
            pending={data?.pending === true}
            failure={
              typeof data?.failure === "string" && data.failure
                ? data.failure
                : null
            }
            progress={parseLiveRunProgressState(data?.progress)}
            initialMinimized={data?.initialMinimized === true}
            workingMessage={
              typeof data?.workingMessage === "string"
                ? data.workingMessage
                : null
            }
            completeMessage={
              typeof data?.completeMessage === "string"
                ? data.completeMessage
                : null
            }
            // Undefined when unset so the window's chat-matched size defaults
            // apply; a per-kind override arrives as a number or "70vh".
            width={
              typeof data?.width === "number" || typeof data?.width === "string"
                ? data.width
                : undefined
            }
            height={
              typeof data?.height === "number" ||
              typeof data?.height === "string"
                ? data.height
                : undefined
            }
          />
        );
}
