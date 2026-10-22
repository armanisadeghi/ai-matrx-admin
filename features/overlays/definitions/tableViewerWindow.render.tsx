"use client";

import { TableViewerWindow } from "@/features/window-panels/windows/TableViewerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <TableViewerWindow
            isOpen
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            content={
              typeof data?.content === "string" ? data.content : undefined
            }
          />
        );
}
