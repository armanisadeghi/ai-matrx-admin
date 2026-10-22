"use client";

import ScopeEditWindow from "@/features/window-panels/windows/context-scopes/ScopeEditWindow";
import type { ScopeEditWindowData } from "@/features/window-panels/windows/context-scopes/ScopeEditWindow";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const raw = overlayData as
          Record<string, unknown> | null | undefined;
        // Narrow the two required fields; everything else stays optional.
        const data: ScopeEditWindowData | undefined =
          raw &&
          typeof raw.scopeTypeId === "string" &&
          typeof raw.organizationId === "string"
            ? {
                scopeTypeId: raw.scopeTypeId,
                organizationId: raw.organizationId,
                scopeId: typeof raw.scopeId === "string" ? raw.scopeId : null,
                parentScopeId:
                  typeof raw.parentScopeId === "string"
                    ? raw.parentScopeId
                    : undefined,
              }
            : undefined;
        if (!data) return <OverlayNeedsData overlayId="scopeEditWindow" onClose={close} />;
        return (
          <ScopeEditWindow
            isOpen
            onClose={() =>
              close()
            }
            data={data}
          />
        );
}
