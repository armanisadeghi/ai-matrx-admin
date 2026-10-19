"use client";

import type { Finding } from "@/features/hindsight/types";
import HindsightFindingWindow from "@/features/window-panels/windows/hindsight/HindsightFindingWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const finding = data?.finding as Finding | null | undefined;
        if (!finding || typeof finding.id !== "string") return <OverlayNeedsData overlayId="hindsightFindingWindow" onClose={close} />;
        const findings = Array.isArray(data?.findings)
          ? (data.findings as Finding[])
          : [finding];
        return (
          <HindsightFindingWindow
            key={`${instanceId}:${finding.id}`}
            instanceId={instanceId}
            finding={finding}
            findings={findings}
            agentId={typeof data?.agentId === "string" ? data.agentId : null}
            audience={data?.audience === "admin" ? "admin" : "product"}
            onClose={() =>
              close()
            }
          />
        );
}
