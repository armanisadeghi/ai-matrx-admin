"use client";

import ChatDebugWindow from "@/features/window-panels/windows/admin/ChatDebugWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        if (typeof data?.sessionId !== "string" || !data.sessionId) return <OverlayNeedsData overlayId="chatDebugWindow" onClose={close} />;
        return (
          <ChatDebugWindow
            isOpen
            onClose={() =>
              close()
            }
            sessionId={
              typeof data?.sessionId === "string" ? data.sessionId : null
            }
          />
        );
}
