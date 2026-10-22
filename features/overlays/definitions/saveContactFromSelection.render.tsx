"use client";

// Save as contact is the chat package's window (the same body Matrx 2 hosts); this overlay only mounts it.
import SaveContactFromSelectionWindow from "@ai-matrx/chat/window-panels/windows/crm/SaveContactFromSelectionWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {
  const data = overlayData as Record<string, unknown> | null | undefined;
  return (
    <SaveContactFromSelectionWindow
      key={instanceId}
      instanceId={instanceId}
      onClose={() => close()}
      selection={typeof data?.selection === "string" ? data.selection : ""}
      origin={typeof data?.origin === "string" ? data.origin : undefined}
    />
  );
}
