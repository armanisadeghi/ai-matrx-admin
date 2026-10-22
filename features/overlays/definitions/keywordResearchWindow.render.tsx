"use client";

import KeywordResearchWindow from "@/features/window-panels/windows/seo/KeywordResearchWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <KeywordResearchWindow
            isOpen
            onClose={() =>
              close()
            }
            initialKeyword={
              typeof data?.primaryKeyword === "string"
                ? data.primaryKeyword
                : undefined
            }
            autoRun={data?.autoRun === true}
            siteId={typeof data?.siteId === "string" ? data.siteId : null}
          />
        );
}
