"use client";

import SourceReviewWindow from "@/features/resource-manager/source-input/review/SourceReviewWindow";
import type { SourceReviewOptions } from "@/features/resource-manager/source-input/review/types";
import { isSourceSet } from "@ai-matrx/agents/sources";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = overlayData;
        const callbackId =
          typeof data?.callbackGroupId === "string" ? data.callbackGroupId : null;
        return (
          <SourceReviewWindow
            key={callbackId ?? "source-review"}
            isOpen
            onClose={() =>
              close()
            }
            callbackId={callbackId}
            sourceSet={isSourceSet(data?.sourceSet) ? data.sourceSet : null}
            options={
              (data?.options as SourceReviewOptions | undefined) ?? {}
            }
          />
        );
}
