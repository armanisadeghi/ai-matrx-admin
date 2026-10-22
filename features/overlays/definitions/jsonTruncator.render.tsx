"use client";

import type { JsonTruncatorTab } from "@/components/official-candidate/json-truncator/JsonTruncator";
import JsonTruncatorDialog from "@/components/official-candidate/json-truncator/JsonTruncatorDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <JsonTruncatorDialog
            isOpen
            overlayId="jsonTruncator"
            onClose={() =>
              close()
            }
            title={typeof data?.title === "string" ? data.title : undefined}
            id={typeof data?.id === "string" ? data.id : "json-truncator"}
            defaultTab={data?.defaultTab as JsonTruncatorTab | undefined}
          />
        );
}
