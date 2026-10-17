"use client";

import { readDetailOverlayData } from "@/features/window-panels/detail/detailOverlayData";
import DetailWindow from "@/features/window-panels/windows/detail/DetailWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        if (!isOpen) return null;
        const data = readDetailOverlayData(overlayData);
        if (!data) return null;
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
