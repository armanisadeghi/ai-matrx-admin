"use client";

import type { ExtractionCellEditorTargetInput } from "@/features/page-extraction/data-review/extractionCellEditorCallbacks";
import ExtractionCellEditorWindow from "@/features/window-panels/windows/page-extraction/ExtractionCellEditorWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const rowId = typeof data?.rowId === "string" ? data.rowId : null;
        const columnKey =
          typeof data?.columnKey === "string" ? data.columnKey : null;
        const writeKey =
          typeof data?.writeKey === "string" ? data.writeKey : null;
        const readOnly = data?.readOnly === true;
        if (!rowId || !columnKey) return null;
        const currentPayload = data?.currentPayload;
        if (
          !readOnly &&
          (!writeKey ||
            !currentPayload ||
            typeof currentPayload !== "object" ||
            Array.isArray(currentPayload))
        ) return null;
        const commonTarget = {
          rowId,
          columnKey,
          columnLabel:
            typeof data?.columnLabel === "string" ? data.columnLabel : columnKey,
          pageLabel: typeof data?.pageLabel === "string" ? data.pageLabel : "—",
          value: typeof data?.value === "string" ? data.value : "",
        };
        let target: ExtractionCellEditorTargetInput;
        if (readOnly) {
          target = { ...commonTarget, readOnly: true };
        } else {
          if (!writeKey || !currentPayload || typeof currentPayload !== "object" || Array.isArray(currentPayload)) return null;
          target = {
            ...commonTarget,
            readOnly: false,
            writeKey,
            currentPayload: currentPayload as Record<string, unknown>,
          };
        }
        return (
          <ExtractionCellEditorWindow
            key={instanceId}
            instanceId={instanceId}
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            target={target}
            onClose={() =>
              close()
            }
          />
        );
}
