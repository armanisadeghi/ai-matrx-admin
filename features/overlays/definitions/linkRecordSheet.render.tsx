"use client";

import { LinkRecordOverlay } from "@/features/rich-document/annotations/LinkRecordOverlay";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = overlayData;
        const raw =
          data?.target && typeof data.target === "object"
            ? (data.target as Record<string, unknown>)
            : null;
        if (!raw || typeof raw.token !== "string" || typeof raw.id !== "string") return <OverlayNeedsData overlayId="linkRecordSheet" onClose={close} />;
        return (
          <LinkRecordOverlay
            target={{
              token: raw.token,
              id: raw.id,
              title: typeof raw.title === "string" ? raw.title : "",
              ...(typeof raw.tableId === "string" ? { tableId: raw.tableId } : {}),
              ...(typeof raw.organizationId === "string" ? { organizationId: raw.organizationId } : {}),
            }}
            onClose={() =>
              close()
            }
          />
        );
}
