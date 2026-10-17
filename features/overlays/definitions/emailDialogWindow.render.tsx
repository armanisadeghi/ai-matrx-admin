"use client";

import EmailDialogWindow from "@/features/window-panels/windows/EmailDialogWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <EmailDialogWindow
            isOpen
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            description={
              typeof data?.description === "string"
                ? data.description
                : undefined
            }
            submitLabel={
              typeof data?.submitLabel === "string"
                ? data.submitLabel
                : undefined
            }
          />
        );
}
