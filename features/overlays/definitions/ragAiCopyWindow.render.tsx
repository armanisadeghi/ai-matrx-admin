"use client";

import type { RagAiCopyBundle, RagAiSectionKey } from "@/features/rag/components/search/ragAiCopy";
import RagAiCopyWindow from "@/features/window-panels/windows/rag/RagAiCopyWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          | {
              bundle?: RagAiCopyBundle;
              initialSections?: RagAiSectionKey[] | null;
            }
          | null
          | undefined;
        if (!data?.bundle) return <OverlayNeedsData overlayId="ragAiCopyWindow" onClose={close} />;
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
