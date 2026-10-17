"use client";

import CreateProjectWindow from "@/features/window-panels/windows/projects/CreateProjectWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        console.log(
          "[Track New Project] 11, OverlayController.tsx — rendering <CreateProjectWindow />",
          { instanceId: instanceId },
        );
        return (
          <CreateProjectWindow
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
            initialOrgId={
              typeof data?.initialOrgId === "string" ? data.initialOrgId : null
            }
            initialOrgSlug={
              typeof data?.initialOrgSlug === "string"
                ? data.initialOrgSlug
                : null
            }
            orgLocked={
              typeof data?.orgLocked === "boolean" ? data.orgLocked : false
            }
            skipRedirect={
              typeof data?.skipRedirect === "boolean" ? data.skipRedirect : true
            }
          />
        );
}
