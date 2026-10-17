"use client";

import DataSourceWindow from "@/features/window-panels/windows/data-sources/DataSourceWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const sourceKey = typeof data?.sourceKey === "string" ? data.sourceKey : null;
        const values =
          data?.values && typeof data.values === "object"
            ? (data.values as Record<string, string>)
            : undefined;
        if (!isOpen || !sourceKey) return null;
        return (
          <DataSourceWindow
            isOpen
            sourceKey={sourceKey}
            initialValues={values}
            onClose={() =>
              close()
            }
          />
        );
}
