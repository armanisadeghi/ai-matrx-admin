"use client";

import { readDetailOverlayData } from "@/features/window-panels/detail/detailOverlayData";
import DetailWindow from "@/features/window-panels/windows/detail/DetailWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = readDetailOverlayData(overlayData);
        if (!data) return <OverlayNeedsData overlayId="detailWindow" onClose={close} />;
        return (
          <DetailWindow
            isOpen
            onClose={() => close()}
            type={data.type}
            id={data.id}
            seedName={data.seedName}
            seedAbout={data.seedAbout}
            listItems={data.listItems}
            listIndex={data.listIndex}
            listTrimmedFrom={data.listTrimmedFrom}
          />
        );
}
