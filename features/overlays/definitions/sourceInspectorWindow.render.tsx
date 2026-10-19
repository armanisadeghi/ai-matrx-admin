"use client";

import SourceInspectorWindow from "@/features/window-panels/windows/source-inspector/SourceInspectorWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const pageNumbers = Array.isArray(data?.pageNumbers)
          ? (data.pageNumbers as unknown[]).filter(
              (n): n is number => typeof n === "number",
            )
          : null;
        if (typeof data?.sourceKind !== "string" || !data.sourceKind || typeof data?.sourceId !== "string" || !data.sourceId) return <OverlayNeedsData overlayId="sourceInspectorWindow" onClose={close} />;
        return (
          <SourceInspectorWindow
            // Data-derived key: this is a SINGLETON overlay, so opening a new
            // citation while one is open re-renders in place. Keying on the
            // source identity forces a clean remount, resetting the pane's
            // activePage / active tab to the new citation (otherwise they stay
            // stuck on the previous source — see review P1).
            key={`${typeof data?.sourceId === "string" ? data.sourceId : ""}:${
              typeof data?.chunkId === "string" ? data.chunkId : ""
            }:${typeof data?.pageNumber === "number" ? data.pageNumber : ""}:${
              typeof data?.seekMs === "number" ? data.seekMs : ""
            }`}
            isOpen
            onClose={() =>
              close()
            }
            sourceKind={
              typeof data?.sourceKind === "string" ? data.sourceKind : null
            }
            sourceId={typeof data?.sourceId === "string" ? data.sourceId : null}
            chunkId={typeof data?.chunkId === "string" ? data.chunkId : null}
            pageNumber={
              typeof data?.pageNumber === "number" ? data.pageNumber : null
            }
            pageNumbers={pageNumbers}
            snippet={typeof data?.snippet === "string" ? data.snippet : null}
            fileName={typeof data?.fileName === "string" ? data.fileName : null}
            score={typeof data?.score === "number" ? data.score : null}
            query={typeof data?.query === "string" ? data.query : null}
            href={typeof data?.href === "string" ? data.href : null}
            seekMs={typeof data?.seekMs === "number" ? data.seekMs : null}
            placeLabel={
              typeof data?.placeLabel === "string" ? data.placeLabel : null
            }
          />
        );
}
