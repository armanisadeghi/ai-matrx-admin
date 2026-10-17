"use client";

import DiffViewerWindow from "@/features/window-panels/windows/DiffViewerWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        return (
          <DiffViewerWindow
            key={instanceId}
            windowInstanceId={
              typeof data?.windowInstanceId === "string"
                ? data.windowInstanceId
                : instanceId
            }
            onClose={() =>
              close()
            }
            original={typeof data?.original === "string" ? data.original : ""}
            modified={typeof data?.modified === "string" ? data.modified : ""}
            originalLabel={
              typeof data?.originalLabel === "string"
                ? data.originalLabel
                : undefined
            }
            modifiedLabel={
              typeof data?.modifiedLabel === "string"
                ? data.modifiedLabel
                : undefined
            }
            title={typeof data?.title === "string" ? data.title : null}
            engine={
              data?.engine === "light" ||
              data?.engine === "monaco" ||
              data?.engine === "auto"
                ? data.engine
                : "auto"
            }
            language={
              typeof data?.language === "string" ? data.language : undefined
            }
            defaultView={
              data?.defaultView === "inline" ||
              data?.defaultView === "highlight"
                ? data.defaultView
                : "split"
            }
          />
        );
}
