"use client";

import { ImageViewerWindow } from "@/features/window-panels/windows/image/ImageViewerWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        if (!Array.isArray(data?.images) || data.images.length === 0) return <OverlayNeedsData overlayId="imageViewer" onClose={close} />;
        return (
          <ImageViewerWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            images={
              Array.isArray(data?.images) &&
              data.images.every((v) => typeof v === "string")
                ? (data.images as string[])
                : []
            }
            initialIndex={
              typeof data?.initialIndex === "number"
                ? data.initialIndex
                : undefined
            }
            alts={
              Array.isArray(data?.alts) &&
              data.alts.every((v) => typeof v === "string")
                ? (data.alts as string[])
                : undefined
            }
            title={typeof data?.title === "string" ? data.title : undefined}
          />
        );
}
