"use client";

import type { RagAiCopyBundle, RagAiSectionKey } from "@/features/rag/components/search/ragAiCopy";
import RagAiCopyWindow from "@/features/window-panels/windows/rag/RagAiCopyWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          | {
              bundle?: RagAiCopyBundle;
              initialSections?: RagAiSectionKey[] | null;
            }
          | null
          | undefined;
        if (!isOpen) return null;
        return (
          <RagAiCopyWindow
            isOpen
            onClose={() =>
              close()
            }
            bundle={data?.bundle ?? null}
            initialSections={
              Array.isArray(data?.initialSections) ? data.initialSections : null
            }
          />
        );
}
