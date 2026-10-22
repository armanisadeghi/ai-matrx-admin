"use client";

import ConnectorConsentDialog from "@/features/connectors/ConnectorConsentDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          | Record<string, unknown>
          | null
          | undefined;
        return (
          <ConnectorConsentDialog
            isOpen
            onClose={() =>
              close()
            }
            initialConnectionId={
              typeof data?.initialConnectionId === "string"
                ? data.initialConnectionId
                : null
            }
            initialProductKeys={
              Array.isArray(data?.initialProductKeys)
                ? (data.initialProductKeys as unknown[]).filter(
                    (key): key is string => typeof key === "string",
                  )
                : undefined
            }
          />
        );
}
