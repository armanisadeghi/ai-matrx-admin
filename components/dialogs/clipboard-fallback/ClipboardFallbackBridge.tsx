"use client";

/**
 * components/dialogs/clipboard-fallback/ClipboardFallbackBridge.tsx
 *
 * Packages ask for a manual copy through kit's `openClipboardFallback`, which needs ONE registered host.
 * This is that host, with no dialog of its own: each ask is forwarded to `showManualCopy`, the summon overlay
 * `clipboardFallbackDialog`, so the dialog body loads only when someone needs it (never in first load).
 * Mount once, beside `<ConfirmDialogHost />`.
 */
import { useEffect } from "react";
import { clipboardFallbackOpener } from "@ai-matrx/kit/clipboard-fallback-opener";
import { useOpenerHost } from "@ai-matrx/kit/opener-react";

import { showManualCopy } from "./manualCopyOpener";

export function ClipboardFallbackBridge() {
  const { request, settle } = useOpenerHost(clipboardFallbackOpener);
  useEffect(() => {
    if (!request) return;
    void showManualCopy(request).then(() => settle(undefined));
  }, [request, settle]);
  return null;
}
