"use client";

import { UserTableWindow } from "@/features/window-panels/windows/UserTableWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <UserTableWindow
            isOpen
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            tableId={
              typeof data?.tableId === "string" ? data.tableId : undefined
            }
          />
        );
}
