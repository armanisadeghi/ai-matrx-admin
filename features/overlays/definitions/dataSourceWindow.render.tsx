"use client";

import DataSourceWindow from "@/features/window-panels/windows/data-sources/DataSourceWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const sourceKey = typeof data?.sourceKey === "string" ? data.sourceKey : null;
        const values =
          data?.values && typeof data.values === "object"
            ? (data.values as Record<string, string>)
            : undefined;
        if (!sourceKey) return <OverlayNeedsData overlayId="dataSourceWindow" onClose={close} />;
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
