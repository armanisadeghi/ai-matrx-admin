"use client";

import CharacterCounterWindow from "@/features/window-panels/windows/text-counter/CharacterCounterWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <CharacterCounterWindow
            isOpen
            onClose={() =>
              close()
            }
            initialText={
              typeof data?.initialText === "string"
                ? data.initialText
                : undefined
            }
          />
        );
}
