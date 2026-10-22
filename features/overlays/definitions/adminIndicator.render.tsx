"use client";

import AdminIndicator from "@/components/admin/controls/AdminIndicator";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <AdminIndicator
            isOpen
            onClose={() =>
              close()
            }
          />
        );
}
