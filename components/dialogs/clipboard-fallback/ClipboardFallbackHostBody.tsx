/**
 * components/dialogs/clipboard-fallback/ClipboardFallbackHostBody.tsx
 *
 * The manual-copy dialog's body: the summon overlay `clipboardFallbackDialog`, asked by
 * `showManualCopy(...)` through `requestOverlay` (one at a time; later asks wait their turn).
 */

"use client";

import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@ai-matrx/summon/react";
import { ClipboardFallbackDialog } from "./ClipboardFallbackDialog";
import type { ManualCopyOptions } from "./manualCopyOpener";

export default function ClipboardFallbackHostBody({ data, close }: OverlayRenderProps) {
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
