"use client";

/**
 * Opener for the `captureInspectorWindow` overlay.
 *
 * - `useOpenCaptureInspectorWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<CaptureInspectorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "captureInspectorWindow" as const;

export interface OpenCaptureInspectorWindowOptions {
  initialExchangeId?: string | null;
}

export interface CaptureInspectorWindowHandle {
  close: () => void;
}

export function useOpenCaptureInspectorWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenCaptureInspectorWindowOptions = {},
    ): CaptureInspectorWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: { initialExchangeId: opts.initialExchangeId },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function CaptureInspectorWindowController(
  props: OpenCaptureInspectorWindowOptions,
): null {
  const open = useOpenCaptureInspectorWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialExchangeId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CaptureInspectorWindowDefinitionData = OpenCaptureInspectorWindowOptions;

export const captureInspectorWindowOverlay = /* @__PURE__ */ defineOverlay<CaptureInspectorWindowDefinitionData>()({
  id: "captureInspectorWindow",
  label: "Capture Inspector",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialExchangeId: null },
    windowId: "capture-inspector",
    mobile: "card",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    captureInspectorWindow: OverlayWire<CaptureInspectorWindowDefinitionData>;
  }
}
