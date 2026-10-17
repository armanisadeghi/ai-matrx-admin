"use client";

import SocialPostWindow from "@/features/window-panels/windows/marketing/SocialPostWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        // No post or no organization = nothing to show; a stale persisted
        // session can carry that, the opener never produces it.
        if (typeof data?.postId !== "string" || !data.postId) return null;
        if (typeof data.organizationId !== "string" || !data.organizationId) return null;
        return (
          <SocialPostWindow
            key={instanceId}
            instanceId={instanceId}
            stackIndex={typeof data.stackIndex === "number" ? data.stackIndex : 0}
            onClose={() =>
              close()
            }
            postId={data.postId}
            organizationId={data.organizationId}
            brandSeg={typeof data.brandSeg === "string" ? data.brandSeg : ""}
            initialTab={typeof data.tab === "string" ? data.tab : "overview"}
            landscape={data.landscape === true}
          />
        );
}
