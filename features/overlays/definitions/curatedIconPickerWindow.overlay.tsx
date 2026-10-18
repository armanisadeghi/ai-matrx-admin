"use client";

/**
 * Opener for the `curatedIconPickerWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (full callback-aware API
 * via the callback registry for `onIconPick`/`onClose`).
 */
import { useEffect } from "react";
import {
  useOpenCuratedIconPickerWindow,
  type OpenCuratedIconPickerOptions,
  type CuratedIconPickerHandle,
} from "@/features/window-panels/windows/icons/useOpenCuratedIconPickerWindow";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";

export {
  useOpenCuratedIconPickerWindow,
  type OpenCuratedIconPickerOptions,
  type CuratedIconPickerHandle,
};

export function CuratedIconPickerWindowController(
  props: OpenCuratedIconPickerOptions,
): null {
  const open = useOpenCuratedIconPickerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.instanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CuratedIconPickerWindowDefinitionData = OpenCuratedIconPickerOptions;

export const curatedIconPickerWindowOverlay = /* @__PURE__ */ defineOverlay<CuratedIconPickerWindowDefinitionData>()({
  id: "curatedIconPickerWindow",
  label: "Curated Icon Picker Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { callbackGroupId: null as string | null },
    windowId: "curated-icon-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    curatedIconPickerWindow: UntypedOverlayWire;
  }
}
