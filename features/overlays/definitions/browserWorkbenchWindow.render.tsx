"use client";

import BrowserWorkbenchWindow from "@/features/window-panels/windows/iframe/BrowserWorkbenchWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <BrowserWorkbenchWindow
            isOpen
            onClose={() =>
              close()
            }
            initialBookmarks={data?.initialBookmarks as unknown}
            initialTabs={(data?.initialTabs ?? data?.tabs) as unknown}
            initialActiveTabId={
              typeof data?.initialActiveTabId === "string"
                ? data.initialActiveTabId
                : typeof data?.activeTabId === "string"
                  ? data.activeTabId
                  : null
            }
          />
        );
}
