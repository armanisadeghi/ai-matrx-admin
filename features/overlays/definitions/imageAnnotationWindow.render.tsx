"use client";

import ImageAnnotationWindow from "@/features/window-panels/windows/image-annotation/ImageAnnotationWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <ImageAnnotationWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            sourceFileId={
              typeof data?.sourceFileId === "string" ? data.sourceFileId : null
            }
            sourceUrl={
              typeof data?.sourceUrl === "string" ? data.sourceUrl : null
            }
            sourceFilename={
              typeof data?.sourceFilename === "string"
                ? data.sourceFilename
                : null
            }
            defaultFolder={
              typeof data?.defaultFolder === "string"
                ? data.defaultFolder
                : null
            }
            title={typeof data?.title === "string" ? data.title : null}
            overwriteSource={
              typeof data?.overwriteSource === "boolean"
                ? data.overwriteSource
                : false
            }
          />
        );
}
