"use client";

/**
 * The `clipboardFallbackDialog` overlay, asked by `showManualCopy(...)` through `requestOverlay` (one at a time;
 * later asks wait their turn). The dialog is design-system's `ClipboardFallbackDialog`.
 */
import { ClipboardFallbackDialog } from "@ai-matrx/design-system";
import { useOverlayRequest, type OverlayRenderProps } from "@ai-matrx/summon/react";
import type { ManualCopyOptions } from "@/components/dialogs/clipboard-fallback/manualCopyOpener";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  const { request: active, settle } = useOverlayRequest<ManualCopyOptions, void>(data, close);
  if (!active) return null;
  return (
    <ClipboardFallbackDialog
      open
      onOpenChange={(open) => {
        if (!open) settle(undefined);
      }}
      url={active.text}
      title={active.title ?? "Copy manually"}
      description={
        active.description ??
        "This browser blocked automatic copying. The text is selected — press Cmd/Ctrl+C, or try the Copy button."
      }
    />
  );
}
