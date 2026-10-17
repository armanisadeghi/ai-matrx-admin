"use client";

import { SaveToTableOverlay } from "@/features/save-to-table/SaveToTableOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const grid = data?.grid as { headers?: unknown; rows?: unknown; from?: unknown } | null | undefined;
        return (
          <SaveToTableOverlay
            key={instanceId}
            isOpen
            onClose={() =>
              close()
            }
            text={typeof data?.text === "string" ? data.text : null}
            value={data?.value}
            hasValue={data?.hasValue === true}
            grid={
              grid && Array.isArray(grid.headers) && Array.isArray(grid.rows)
                ? {
                    headers: grid.headers as string[],
                    rows: grid.rows as string[][],
                    ...(typeof grid.from === "string" ? { from: grid.from } : {}),
                  }
                : null
            }
            title={typeof data?.title === "string" ? data.title : null}
            shapeIndex={
              typeof data?.shapeIndex === "number" ? data.shapeIndex : 0
            }
            organizationId={
              typeof data?.organizationId === "string"
                ? data.organizationId
                : null
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            makeAtOnce={data?.makeAtOnce === true}
          />
        );
}
