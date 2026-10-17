"use client";

import CredentialVaultWindow from "@/features/window-panels/windows/vault/VaultWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        return (
          <CredentialVaultWindow
            isOpen
            onClose={() =>
              close()
            }
            initialSelectedItemId={
              (data?.selectedItemId as string | null) ?? null
            }
            initialLocation={(data?.location as string | null) ?? null}
          />
        );
}
