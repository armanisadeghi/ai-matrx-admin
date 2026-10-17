"use client";

import AiWatchWindow from "@/features/window-panels/windows/ai-watch/AiWatchWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const text = (v: unknown) => (typeof v === "string" && v ? v : null);
        return (
          <AiWatchWindow
            key={instanceId}
            windowInstanceId={text(data?.windowInstanceId) ?? instanceId}
            onClose={() =>
              close()
            }
            requestId={text(data?.requestId)}
            userRequestId={text(data?.userRequestId)}
            workflowRunId={text(data?.workflowRunId)}
            conversationId={text(data?.conversationId)}
            focusAt={typeof data?.focusAt === "number" ? data.focusAt : null}
            nodeId={text(data?.nodeId)}
            label={text(data?.label)}
          />
        );
}
