"use client";

import DataChangesWindow from "@/features/window-panels/windows/data-sources/DataChangesWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const tableId = typeof data?.tableId === "string" ? data.tableId : null;
        if (!tableId) return <OverlayNeedsData overlayId="dataChangesWindow" onClose={close} />;
        return (
          <DataChangesWindow
            isOpen
            tableId={tableId}
            organizationId={typeof data?.organizationId === "string" ? data.organizationId : null}
            jobId={typeof data?.jobId === "string" ? data.jobId : null}
            tableName={typeof data?.tableName === "string" ? data.tableName : null}
            onClose={() =>
              close()
            }
          />
        );
}
