"use client";

import LiveIntegrationsWindow from "@/features/window-panels/windows/connectors/LiveIntegrationsWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  return (
    <LiveIntegrationsWindow
      isOpen
      provider={typeof data?.provider === "string" ? data.provider : null}
      search={typeof data?.search === "string" ? data.search : null}
      conversationId={typeof data?.conversationId === "string" ? data.conversationId : null}
      openedAt={typeof data?.openedAt === "number" ? data.openedAt : 0}
      onClose={() => close()}
    />
  );
}
