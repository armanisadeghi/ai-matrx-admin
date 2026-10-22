"use client";

import { UtilitiesOverlay } from "@/features/quick-actions/components/UtilitiesOverlay";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        return (
          <UtilitiesOverlay
            isOpen
            onClose={() =>
              close()
            }
            initialTab={
              (
                [
                  "notes",
                  "tasks",
                  "chat",
                  "data",
                  "files",
                  "ai-results",
                ] as ReadonlyArray<unknown>
              ).includes(data?.initialTab)
                ? (data?.initialTab as
                    | "notes"
                    | "tasks"
                    | "chat"
                    | "data"
                    | "files"
                    | "ai-results")
                : undefined
            }
          />
        );
}
