"use client";

import { isMessageRole } from "./controller-helpers";
import QuickMessageTemplateSaveWindow from "@/features/window-panels/windows/message-templates/QuickMessageTemplateSaveWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData;
        if (!isOpen) return null;
        return (
          <QuickMessageTemplateSaveWindow
            isOpen
            onClose={() =>
              close()
            }
            initialContent={
              typeof data?.initialContent === "string"
                ? data.initialContent
                : undefined
            }
            defaultName={
              typeof data?.defaultName === "string"
                ? data.defaultName
                : undefined
            }
            defaultRole={
              isMessageRole(data?.defaultRole) ? data.defaultRole : undefined
            }
          />
        );
}
