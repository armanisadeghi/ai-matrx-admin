"use client";

import { DictionarySelectorWindow } from "@/features/dictionary/components/DictionarySelectorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const surfaceKey = (data?.surfaceKey as string) ?? "_default";
        return (
          <DictionarySelectorWindow
            isOpen
            surfaceKey={surfaceKey}
            onClose={() =>
              close()
            }
          />
        );
}
