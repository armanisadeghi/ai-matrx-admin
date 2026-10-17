"use client";

import GoogleTasksImportWindow from "@/features/window-panels/windows/google-import/GoogleTasksImportWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = overlayData;
        return (
          <GoogleTasksImportWindow
            isOpen
            onClose={() =>
              close()
            }
            organizationId={
              typeof data?.organizationId === "string" ? data.organizationId : null
            }
            projectId={typeof data?.projectId === "string" ? data.projectId : null}
          />
        );
}
