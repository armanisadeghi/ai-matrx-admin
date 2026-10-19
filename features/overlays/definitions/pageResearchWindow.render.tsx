"use client";

import PageResearchWindow from "@/features/window-panels/windows/marketing/PageResearchWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const str = (key: string): string | undefined =>
          typeof data?.[key] === "string" && data[key]
            ? (data[key] as string)
            : undefined;
        const nodeId = str("nodeId");
        // No page, no page research — the window's whole subject is the node.
        if (!nodeId) return <OverlayNeedsData overlayId="pageResearchWindow" onClose={close} />;
        return (
          <PageResearchWindow
            isOpen
            onClose={() =>
              close()
            }
            nodeId={nodeId}
            siteId={str("siteId")}
            pageLabel={str("pageLabel")}
            primaryKeyword={str("primaryKeyword")}
            orgId={str("orgId")}
          />
        );
}
