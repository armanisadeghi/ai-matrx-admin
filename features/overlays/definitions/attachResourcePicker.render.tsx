"use client";

import type { AttachableResource } from "@/features/connectors/attachable-resources";
import AttachResourceDialog from "@/features/connectors/AttachResourceDialog";
import { OverlayNeedsData } from "@/features/overlays/components/OverlayNeedsData";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const conversationId =
          typeof data?.conversationId === "string" ? data.conversationId : null;
        const provider =
          typeof data?.provider === "string" ? data.provider : null;
        if (!conversationId || !provider) return <OverlayNeedsData overlayId="attachResourcePicker" onClose={close} />;
        return (
          <AttachResourceDialog
            isOpen
            onClose={() =>
              close()
            }
            conversationId={conversationId}
            provider={provider}
            providerName={
              typeof data?.providerName === "string"
                ? data.providerName
                : provider
            }
            attachable={
              Array.isArray(data?.attachable)
                ? (data.attachable as AttachableResource[])
                : []
            }
          />
        );
}
