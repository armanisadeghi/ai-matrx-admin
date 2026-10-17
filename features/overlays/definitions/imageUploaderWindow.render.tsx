"use client";

import type { AssetPreset } from "@/features/files/types";
import ImageUploaderWindow from "@/features/window-panels/windows/image/ImageUploaderWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <ImageUploaderWindow
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
            preset={data?.preset as AssetPreset | undefined}
            folder={typeof data?.folder === "string" ? data.folder : undefined}
            title={typeof data?.title === "string" ? data.title : null}
            description={
              typeof data?.description === "string" ? data.description : null
            }
            currentUrl={
              typeof data?.currentUrl === "string" ? data.currentUrl : null
            }
            allowUrlPaste={
              typeof data?.allowUrlPaste === "boolean"
                ? data.allowUrlPaste
                : undefined
            }
          />
        );
}
