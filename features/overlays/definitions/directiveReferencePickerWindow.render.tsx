"use client";

import { DirectiveReferencePickerWindow } from "@/features/window-panels/windows/admin/directive-reference-picker/DirectiveReferencePickerWindow";
import { isEntityTypeToken } from "@ai-matrx/associations";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as Record<string, unknown> | null | undefined;
        const entityToken =
          typeof data?.entityToken === "string" &&
          isEntityTypeToken(data.entityToken)
            ? data.entityToken
            : null;
        if (!entityToken) return <OverlayNeedsData overlayId="directiveReferencePickerWindow" onClose={close} />;
        return (
          <DirectiveReferencePickerWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            callbackGroupId={
              typeof data?.callbackGroupId === "string"
                ? data.callbackGroupId
                : null
            }
            entityToken={entityToken}
            fieldKey={typeof data?.fieldKey === "string" ? data.fieldKey : "id"}
            title={typeof data?.title === "string" ? data.title : null}
          />
        );
}
